"""
Camera service manager for Flask API integration.
Manages the camera loop thread and allows start/stop control via API.
"""

import logging
import threading
from pathlib import Path
from typing import Optional, Tuple
from camera.camera_module import run_camera_loop

logger = logging.getLogger(__name__)


class CameraService:
    """Thread-safe camera service manager"""
    
    def __init__(self):
        self.camera_thread: Optional[threading.Thread] = None
        self.stop_event: Optional[threading.Event] = None
        self.is_running = False
        self.lock = threading.Lock()
        
        # Status tracking for motion and recording
        self.motion_detected = False
        self.is_currently_recording = False
        self.last_motion_level = 0.0
        
        # Default camera settings
        self.camera_index = 0
        self.processing_fps = 10.0
        self.min_contour_area = 2000
        self.capture_width = None
        self.capture_height = None
        self.capture_fps = None
        self.max_frame_failures = 10
        self.inactivity_timeout = 5.0
        self.delta_thresh = 50
        
        # Get base directory for data storage
        base_dir = Path(__file__).resolve().parents[1]
        self.image_dir = base_dir / "data" / "images"
    
    def start(self, **kwargs) -> Tuple[dict, int]:
        """Start the camera loop in a background thread"""
        with self.lock:
            if self.is_running:
                return {"error": "Camera service is already running"}, 400
            
            # Update settings from kwargs if provided
            self.camera_index = kwargs.get("camera_index", self.camera_index)
            self.processing_fps = kwargs.get("fps", self.processing_fps)
            self.min_contour_area = kwargs.get("min_area", self.min_contour_area)
            self.capture_width = kwargs.get("width", self.capture_width)
            self.capture_height = kwargs.get("height", self.capture_height)
            self.capture_fps = kwargs.get("capture_fps", self.capture_fps)
            self.max_frame_failures = kwargs.get("max_frame_failures", self.max_frame_failures)
            self.inactivity_timeout = kwargs.get("inactivity_timeout", self.inactivity_timeout)
            self.delta_thresh = kwargs.get("delta_thresh", self.delta_thresh)
            
            # Create stop event
            self.stop_event = threading.Event()
            
            # Create and start camera thread
            self.camera_thread = threading.Thread(
                target=self._run_camera_loop,
                daemon=True,
                name="CameraLoop"
            )
            self.camera_thread.start()
            self.is_running = True
            
            logger.info("Camera service started")
            return {
                "message": "Camera service started",
                "camera_index": self.camera_index,
                "processing_fps": self.processing_fps
            }, 200
    
    def stop(self) -> Tuple[dict, int]:
        """Stop the camera loop (non-blocking - returns immediately)"""
        with self.lock:
            if not self.is_running:
                return {"error": "Camera service is not running"}, 400
            
            # Signal stop (thread will finish processing and exit)
            if self.stop_event:
                self.stop_event.set()
            
            # Mark as not running immediately, but let thread finish cleanup
            # The thread will reset state in its finally block
            self.is_running = False
            
            logger.info("Stop signal sent to camera service (thread will finish processing)")
            return {"message": "Camera service stop signal sent"}, 200
    
    def get_status(self) -> dict:
        """Get current camera service status"""
        with self.lock:
            status = {
                "is_running": self.is_running,
                "camera_index": self.camera_index,
                "processing_fps": self.processing_fps,
                "min_contour_area": self.min_contour_area,
                "motion_detected": self.motion_detected,
                "is_currently_recording": self.is_currently_recording,
                "last_motion_level": self.last_motion_level,
            }
            if self.camera_thread:
                status["thread_alive"] = self.camera_thread.is_alive()
            return status
    
    def update_status(self, motion_detected: bool, is_recording: bool, motion_level: float = 0.0):
        """Update motion and recording status (called by camera loop)"""
        with self.lock:
            self.motion_detected = motion_detected
            self.is_currently_recording = is_recording
            self.last_motion_level = motion_level
    
    def _run_camera_loop(self):
        """Internal method to run the camera loop"""
        try:
            # Create status callback to update service state
            def status_callback(motion_detected: bool, is_recording: bool, motion_level: float):
                self.update_status(motion_detected, is_recording, motion_level)
            
            run_camera_loop(
                camera_index=self.camera_index,
                processing_fps=self.processing_fps,
                min_contour_area=self.min_contour_area,
                image_dir=self.image_dir,
                stop_event=self.stop_event,
                capture_width=self.capture_width,
                capture_height=self.capture_height,
                capture_fps=self.capture_fps,
                max_frame_failures=self.max_frame_failures,
                inactivity_timeout=self.inactivity_timeout,
                delta_thresh=self.delta_thresh,
                status_callback=status_callback,
            )
        except Exception as e:
            logger.error(f"Camera loop error: {e}", exc_info=True)
        finally:
            with self.lock:
                self.is_running = False
                # Reset status when loop stops
                self.motion_detected = False
                self.is_currently_recording = False
                self.last_motion_level = 0.0
                logger.info("Camera loop thread finished and cleaned up")


# Global camera service instance
_camera_service: Optional[CameraService] = None


def get_camera_service() -> CameraService:
    """Get or create the global camera service instance"""
    global _camera_service
    if _camera_service is None:
        _camera_service = CameraService()
    return _camera_service

