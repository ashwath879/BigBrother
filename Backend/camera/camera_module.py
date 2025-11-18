"""
Motion detection and enrichment pipeline for the BigBrother camera service.

This version is a simplified, single-function implementation focused on stability,
especially for macOS and Continuity Camera devices that may be unreliable.
"""

from __future__ import annotations

import logging
import os
import sys
import threading
import time
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Callable, Deque, Dict, List, Optional, Tuple
import json

import cv2


try:
    from db.database import add_event, create_memory_node
except (ImportError, ModuleNotFoundError):
    add_event = None
    create_memory_node = None
    logging.warning("Database module not found. Events will be logged to console only.")


def _import_gemini_helpers() -> (Callable[[str], str], Callable[[str], str], Callable[[str], str]):
    """Return `describe_image` and `summarize_video` callables if available, else safe fallbacks."""
    try:
        from ai.gemini_client import describe_image, summarize_video, generate_title
        if not callable(describe_image):
            raise ImportError("describe_image not callable")
        if not callable(summarize_video):
            raise ImportError("summarize_video not callable")
        if not callable(generate_title):
            raise ImportError("generate_title not callable")
        return describe_image, summarize_video, generate_title
    except (ImportError, ModuleNotFoundError) as exc:
        logging.warning("Gemini client unavailable or incomplete: %s", exc)

    def _fallback_describe(image_path: str) -> str:
        return "Vision caption unavailable"
    
    def _fallback_summarize(video_path: str) -> str:
        return "Video summary unavailable"
    
    def _fallback_generate_title(text: str) -> str:
        if not text or len(text.strip()) == 0:
            return "Recording"
        text = text.strip()
        if len(text) > 50:
            last_space = text[:47].rfind(' ')
            if last_space > 20:
                return text[:last_space] + "..."
            return text[:47] + "..."
        return text

    return _fallback_describe, _fallback_summarize, _fallback_generate_title


def _generate_title_from_transcript(transcript: str, generate_title_fn: Callable[[str], str]) -> str:
    """Generate a title from transcript text. Uses Gemini if available, otherwise simple truncation."""
    if not transcript or len(transcript.strip()) == 0:
        return "Recording"
    
    try:
        title = generate_title_fn(transcript)
        return title
    except Exception as e:
        logging.warning(f"Failed to generate title with Gemini: {e}. Using simple truncation.")
        text = transcript.strip()
        if len(text) > 50:
            last_space = text[:47].rfind(' ')
            if last_space > 20:
                return text[:last_space] + "..."
            return text[:47] + "..."
        return text


def _import_audio_helpers():
    """Return audio recorder and transcription functions if available, else None."""
    try:
        from audio import recorder, transcribe_audio, save_transcript
        
        if recorder is None:
            logging.error("✗ Audio recorder is None - audio recording will be disabled")
            return None, None, None
            
        if not hasattr(recorder, 'start_recording') or not hasattr(recorder, 'stop_recording'):
            logging.error("✗ Audio recorder missing required methods - audio recording will be disabled")
            return None, None, None
            
        logging.info("✓ Audio recorder imported successfully (instance: %s)", type(recorder).__name__)
        return recorder, transcribe_audio, save_transcript
    except (ImportError, ModuleNotFoundError) as exc:
        logging.error("✗ Audio module unavailable: %s", exc, exc_info=True)
        return None, None, None
    except Exception as exc:
        logging.error("✗ Error importing audio helpers: %s", exc, exc_info=True)
        return None, None, None


def _load_yolo_model():
    """Load YOLOv8 model if available, otherwise return None."""
    try:
        from ultralytics import YOLO
        model = YOLO("yolov8n.pt")
        logging.info("YOLOv8 model loaded successfully.")
        return model
    except (ImportError, ModuleNotFoundError, Exception) as exc:
        logging.warning("YOLO model unavailable: %s", exc)
        return None

def analyze_and_log_video(
    video_path: str,
    yolo_model,
    describe_image: Callable,
    summarize_video: Callable,
    image_dir: Path,
    audio_path: Optional[str] = None,
    transcript_path: Optional[str] = None,
    transcript: Optional[str] = None,
    generate_title: Optional[Callable[[str], str]] = None,
):
    """
    Analyzes a video in a separate thread, generates a summary, and logs the event.
    Creates a unified MemoryNode with video path, audio path, summary, and transcript.
    """
    try:
        logging.info(f"Starting analysis for {video_path}...")
        
        cap = cv2.VideoCapture(video_path)
        ret, frame = cap.read()
        cap.release()

        if not ret:
            logging.error(f"Failed to read first frame from {video_path} for analysis.")
            return

        ts_utc = datetime.utcnow()
        first_frame_filename = f"thumbnail_{ts_utc.strftime('%Y%m%d_%H%M%S_%f')}.jpg"
        first_frame_path = image_dir / first_frame_filename
        cv2.imwrite(str(first_frame_path), frame)

        objects = []
        if yolo_model:
            try:
                results = yolo_model(first_frame_path, verbose=False)
                if results and hasattr(results[0], "names"):
                    box_classes = results[0].boxes.cls.cpu().numpy()
                    objects = sorted(list(set(results[0].names[int(c)] for c in box_classes)))
            except Exception as e:
                logging.error(f"YOLO prediction failed: {e}")

        summary = ""
        try:
            summary = summarize_video(video_path)
        except Exception as e:
            logging.error(f"Gemini video summary failed: {e}")

        desc_parts = []
        if objects:
            desc_parts.append(f"Objects detected: {', '.join(objects)}")
        if summary:
            desc_parts.append(f"AI Summary: {summary}")
        
        description = " | ".join(desc_parts) or "Video recorded"
        
        logging.info(f"Analysis complete for {video_path}: {description}")

        if add_event:
            try:
                add_event(
                    event_type="video_recording",
                    timestamp=ts_utc.isoformat(),
                    description=description,
                    image_path=video_path,
                )
            except Exception as e:
                logging.error(f"Failed to save video event to database: {e}")
        
        if create_memory_node:
            try:
                from db.database import get_memory_node_by_file_path, update_memory_node_metadata
                
                existing_node = get_memory_node_by_file_path(video_path)
                
                if existing_node:
                    try:
                        existing_metadata = json.loads(existing_node.get('metadata', '{}') or '{}')
                    except:
                        existing_metadata = {}
                    
                    existing_metadata['video_path'] = video_path
                    existing_metadata['summary'] = summary
                    if summary and generate_title and not existing_metadata.get('title'):
                        try:
                            title = _generate_title_from_transcript(summary, generate_title)
                            existing_metadata['title'] = title
                            logging.info(f"Generated title from summary: {title}")
                        except Exception as e:
                            logging.warning(f"Failed to generate title from summary: {e}")
                    existing_metadata['objects_detected'] = objects
                    existing_metadata['description'] = description
                    existing_metadata['thumbnail_path'] = str(first_frame_path)
                    if audio_path:
                        existing_metadata['audio_path'] = audio_path
                    if transcript_path:
                        existing_metadata['transcript_path'] = transcript_path
                    if transcript:
                        existing_metadata['transcript'] = transcript
                    
                    if update_memory_node_metadata(existing_node['id'], existing_metadata):
                        logging.info(f"✓ Updated existing MemoryNode {existing_node['id']} with video analysis data")
                    else:
                        logging.error(f"✗ Failed to update existing MemoryNode {existing_node['id']}")
                else:
                    metadata = {
                        "video_path": video_path,
                        "audio_path": audio_path,
                        "transcript_path": transcript_path,
                        "summary": summary,
                        "transcript": transcript,
                        "objects_detected": objects,
                        "description": description,
                        "thumbnail_path": str(first_frame_path)
                    }
                    create_memory_node(
                        file_path=video_path,
                        file_type="recording",
                        timestamp=ts_utc.isoformat(),
                        metadata=json.dumps(metadata)
                    )
                    logging.info(f"✓ Created new MemoryNode for recording: {video_path}")
            except Exception as e:
                logging.error(f"Failed to create/update MemoryNode: {e}", exc_info=True)

    except Exception as e:
        logging.critical(f"An error occurred during video analysis for {video_path}: {e}", exc_info=True)



def run_camera_loop(
    camera_index: int,
    processing_fps: float,
    min_contour_area: int,
    image_dir: Path,
    stop_event: threading.Event,
    capture_width: Optional[int] = None,
    capture_height: Optional[int] = None,
    capture_fps: Optional[float] = None,
    max_frame_failures: int = 10,
    warmup_period: float = 2.0,
    inactivity_timeout: float = 1.0,
    delta_thresh: int = 50,
    status_callback: Optional[Callable[[bool, bool, float], None]] = None,
):
    """
    Main webcam loop for motion detection and event creation.
    
    Args:
        status_callback: Optional callback(motion_detected: bool, is_recording: bool, motion_level: float)
                         to update status during the loop
    """
    yolo_model = _load_yolo_model()
    describe_image, summarize_video, generate_title_fn = _import_gemini_helpers()
    audio_recorder, transcribe_audio, save_transcript = _import_audio_helpers()
    
    if audio_recorder:
        logging.info("✓ Audio recorder initialized successfully")
        try:
            import sounddevice as sd
            devices = sd.query_devices()
            input_devices = [d for d in devices if d['max_input_channels'] > 0]
            default_input = sd.query_devices(kind='input')
            
            logging.info(f"Audio input devices available: {len(input_devices)}")
            if default_input:
                logging.info(f"Default input device: {default_input['name']} (channels: {default_input['max_input_channels']})")
            
            try:
                test_query = sd.query_devices(kind='input')
                logging.info("✓ Microphone device query successful - permissions appear OK")
            except Exception as perm_error:
                logging.warning(f"⚠ Could not query microphone device: {perm_error}")
                logging.warning("  This might indicate microphone permissions are not granted")
                logging.warning("  On macOS: System Settings > Privacy & Security > Microphone > Enable for Terminal/Python")
        except ImportError:
            logging.warning("⚠ sounddevice not available - cannot test microphone access")
        except Exception as e:
            logging.warning(f"⚠ Error checking microphone access: {e}")
    else:
        logging.warning("✗ Audio recorder not available - audio recording will be disabled")
    
    motion_history_length = int(processing_fps * 2)
    motion_history: Deque[float] = deque(maxlen=motion_history_length)
    
    image_dir.mkdir(parents=True, exist_ok=True)
    recording_dir = image_dir.parent / "recordings"
    recording_dir.mkdir(parents=True, exist_ok=True)
    audio_dir = image_dir.parent / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    transcript_dir = image_dir.parent / "transcripts"
    transcript_dir.mkdir(parents=True, exist_ok=True)

    def _open_capture() -> cv2.VideoCapture:
        """Opens, configures, and primes the video capture device."""
        cap = cv2.VideoCapture(camera_index, cv2.CAP_AVFOUNDATION)
        if not cap.isOpened():
            raise RuntimeError(f"FATAL: Unable to open webcam at index {camera_index}")

        if capture_width:
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, capture_width)
        if capture_height:
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, capture_height)
        if capture_fps:
            cap.set(cv2.CAP_PROP_FPS, capture_fps)
        
        actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        actual_fps = cap.get(cv2.CAP_PROP_FPS)
        logging.info(f"Camera opened: {camera_index} @ {actual_w}x{actual_h}, {actual_fps:.2f} FPS")
        
        logging.info("Priming camera stream...")
        for i in range(30):
            ret, _ = cap.read()
            if ret:
                logging.info(f"Stream is live after {i + 1} attempts.")
                return cap
            time.sleep(0.1)

        cap.release()
        raise RuntimeError("FATAL: Camera opened but failed to start streaming.")

    cap = _open_capture()
    is_recording = False
    last_motion_time = None
    video_writer = None
    consecutive_failures = 0
    audio_path = None
    current_timestamp_str = None
    prev_gray_frame = None
    
    logging.info(f"Starting motion detection loop at ~{processing_fps:.1f} FPS.")

    try:
        while not stop_event.is_set():
            read_start_time = time.monotonic()
            
            ret, frame = cap.read()
            if not ret:
                consecutive_failures += 1
                logging.warning(f"Frame grab failed ({consecutive_failures}/{max_frame_failures})")
                if consecutive_failures >= max_frame_failures:
                    logging.error("Exceeded max frame failures. Aborting.")
                    break
                cap.release()
                try:
                    cap = _open_capture()
                    consecutive_failures = 0
                except RuntimeError as e:
                    logging.error(f"Failed to reopen camera: {e}. Retrying in 5s.")
                    time.sleep(5)
                continue

            small_frame = cv2.resize(frame, (640, 480))
            gray_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2GRAY)
            gray_frame = cv2.GaussianBlur(gray_frame, (21, 21), 0)

            if prev_gray_frame is None:
                prev_gray_frame = gray_frame
                continue

            delta = cv2.absdiff(prev_gray_frame, gray_frame)
            thresh = cv2.threshold(delta, delta_thresh, 255, cv2.THRESH_BINARY)[1]
            thresh = cv2.dilate(thresh, None, iterations=2)
            contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            prev_gray_frame = gray_frame

            total_contour_area = sum(cv2.contourArea(c) for c in contours)
            motion_history.append(total_contour_area)
            avg_motion = sum(motion_history) / len(motion_history) if motion_history else 0
            motion_detected = avg_motion > min_contour_area
            
            if status_callback:
                try:
                    status_callback(motion_detected, is_recording, avg_motion)
                except Exception as e:
                    logging.debug(f"Status callback error: {e}")

            if motion_detected:
                last_motion_time = time.monotonic()
                if not is_recording:
                    is_recording = True
                    ts_utc = datetime.utcnow()
                    current_timestamp_str = ts_utc.strftime('%Y%m%d_%H%M%S')
                    video_filename = f"motion_{current_timestamp_str}.mp4"
                    video_path = str(recording_dir / video_filename)
                    
                    frame_height, frame_width, _ = frame.shape
                    
                    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                    video_writer = cv2.VideoWriter(video_path, fourcc, capture_fps or processing_fps, (frame_width, frame_height))
                    
                    if audio_recorder:
                        audio_filename = f"motion_{current_timestamp_str}.wav"
                        audio_path = str(audio_dir / audio_filename)
                        
                        try:
                            recorder_status = audio_recorder.get_status()
                            logging.info(f"Audio recorder status before start: {recorder_status}")
                            
                            if recorder_status.get('is_recording', False):
                                logging.warning("⚠ Recorder was already recording, stopping first...")
                                try:
                                    stop_result, stop_code = audio_recorder.stop_recording()
                                    logging.info(f"Stopped previous recording: {stop_result}, status: {stop_code}")
                                    time.sleep(0.5)
                                except Exception as e:
                                    logging.error(f"Error stopping previous recording: {e}", exc_info=True)
                        except Exception as e:
                            logging.warning(f"Could not get recorder status: {e}")
                        
                        logging.info(f"Attempting to start audio recording: {audio_path}")
                        try:
                            result, status_code = audio_recorder.start_recording(audio_path)
                            if status_code == 200:
                                logging.info(f"✓ Audio recording started successfully: {audio_path}")
                                try:
                                    after_status = audio_recorder.get_status()
                                    logging.info(f"Recorder status after start: {after_status}")
                                except:
                                    pass
                            else:
                                error_msg = result.get('error', 'Unknown error') if isinstance(result, dict) else str(result)
                                logging.error(f"✗ Failed to start audio recording (status {status_code}): {error_msg}")
                                logging.error(f"  This might be due to:")
                                logging.error(f"  1. Microphone permissions not granted")
                                logging.error(f"  2. Another process using the microphone")
                                logging.error(f"  3. Audio device not available")
                                audio_path = None
                        except Exception as e:
                            logging.error(f"✗ Exception starting audio recording: {e}", exc_info=True)
                            logging.error(f"  Exception type: {type(e).__name__}")
                            audio_path = None
                    else:
                        logging.warning("✗ Audio recorder not available - skipping audio recording")
                        audio_path = None
                    
                    logging.info(f"Motion detected (avg level: {avg_motion:.0f})! Starting new recording: {video_path}")
            
            if is_recording:
                if video_writer:
                    video_writer.write(frame)

                if time.monotonic() - (last_motion_time or 0) > inactivity_timeout:
                    logging.info(f"Motion level below threshold for {inactivity_timeout}s. Stopping recording: {video_path}")
                    is_recording = False
                    
                    current_audio_path = audio_path
                    current_video_path = video_path
                    timestamp_for_transcript = current_timestamp_str if current_timestamp_str else datetime.utcnow().strftime('%Y%m%d_%H%M%S')
                    
                    logging.info(f"Stopping recording - audio_path: {current_audio_path}, audio_recorder available: {audio_recorder is not None}")
                    
                    if audio_recorder and current_audio_path:
                        logging.info(f"Attempting to stop audio recording: {current_audio_path}")
                        try:
                            result, status_code = audio_recorder.stop_recording()
                            if status_code == 200:
                                logging.info(f"✓ Audio recording stopped successfully: {current_audio_path}")
                                import os
                                if os.path.exists(current_audio_path):
                                    file_size = os.path.getsize(current_audio_path)
                                    logging.info(f"✓ Audio file exists: {current_audio_path} ({file_size} bytes)")
                                else:
                                    logging.warning(f"⚠ Audio file not found after stopping: {current_audio_path}")
                            else:
                                logging.error(f"✗ Failed to stop audio recording (status {status_code}): {result.get('error', 'Unknown error')}")
                        except Exception as e:
                            logging.error(f"✗ Exception stopping audio recording: {e}", exc_info=True)
                    else:
                        if not audio_recorder:
                            logging.warning("✗ Audio recorder not available - cannot stop recording")
                        if not current_audio_path:
                            logging.warning("✗ No audio path set - audio was not recorded")
                    
                    if create_memory_node and current_video_path:
                        try:
                            ts_utc = datetime.utcnow()
                            metadata = {
                                "video_path": current_video_path,
                                "audio_path": current_audio_path,
                                "transcript_path": None,
                                "summary": "Loading Summary...",
                                "transcript": None,
                                "title": None,
                                "objects_detected": [],
                                "description": "Motion detected - processing...",
                            }
                            node_id = create_memory_node(
                                file_path=current_video_path,
                                file_type="recording",
                                timestamp=ts_utc.isoformat(),
                                metadata=json.dumps(metadata)
                            )
                            logging.info(f"✓ Created MemoryNode {node_id} immediately after recording stopped (with Loading Summary... placeholder)")
                        except Exception as e:
                            logging.error(f"✗ Failed to create immediate MemoryNode: {e}", exc_info=True)
                    
                    if current_audio_path and os.path.exists(current_audio_path):
                        def transcribe_and_save():
                            try:
                                logging.info(f"Starting transcription for: {current_audio_path}")
                                transcript, timestamp = transcribe_audio(current_audio_path)
                                
                                logging.info("=" * 80)
                                logging.info(f"TRANSCRIPT FOR VIDEO: {current_video_path}")
                                logging.info("=" * 80)
                                logging.info(transcript if transcript else "[No transcript generated]")
                                logging.info("=" * 80)
                                
                                transcript_filename = f"motion_{timestamp_for_transcript}.txt"
                                transcript_path = str(transcript_dir / transcript_filename)
                                transcript_saved = save_transcript(transcript, timestamp, transcript_path)
                                
                                if transcript_saved:
                                    logging.info(f"Transcript saved: {transcript_path}")
                                else:
                                    logging.error(f"Failed to save transcript: {transcript_path}")
                                
                                title = None
                                if transcript and generate_title_fn:
                                    try:
                                        title = _generate_title_from_transcript(transcript, generate_title_fn)
                                        logging.info(f"Generated title from transcript: {title}")
                                    except Exception as e:
                                        logging.warning(f"Failed to generate title from transcript: {e}")
                                if create_memory_node and current_video_path and transcript:
                                    try:
                                        from db.database import (
                                            get_memory_node_by_file_path, 
                                            update_memory_node_metadata,
                                            create_memory_node as create_node
                                        )
                                        
                                        max_retries = 3
                                        retry_delay = 2.0
                                        video_node = None
                                        
                                        logging.info(f"Looking for MemoryNode to update with transcript: {current_video_path}")
                                        
                                        for attempt in range(max_retries):
                                            video_node = get_memory_node_by_file_path(current_video_path)
                                            if video_node:
                                                logging.info(f"✓ Found MemoryNode {video_node['id']} on attempt {attempt + 1}")
                                                break
                                            if attempt < max_retries - 1:
                                                logging.debug(f"MemoryNode not found yet, waiting {retry_delay}s (attempt {attempt + 1}/{max_retries})")
                                                time.sleep(retry_delay)
                                        
                                        if video_node:
                                            try:
                                                existing_metadata = json.loads(video_node.get('metadata', '{}') or '{}')
                                            except:
                                                existing_metadata = {}
                                            
                                            existing_metadata['transcript'] = transcript
                                            existing_metadata['transcript_path'] = transcript_path
                                            existing_metadata['audio_path'] = current_audio_path
                                            if title:
                                                existing_metadata['title'] = title
                                            
                                            if update_memory_node_metadata(video_node['id'], existing_metadata):
                                                logging.info(f"✓ Successfully updated MemoryNode {video_node['id']} with transcript ({len(transcript)} characters)")
                                                
                                                time.sleep(0.5)
                                                updated_node = get_memory_node_by_file_path(current_video_path)
                                                if updated_node:
                                                    try:
                                                        verify_metadata = json.loads(updated_node.get('metadata', '{}') or '{}')
                                                        if verify_metadata.get('transcript'):
                                                            logging.info(f"✓✓ Verified: transcript is stored in MemoryNode {video_node['id']}")
                                                            logging.info(f"   Transcript preview: {transcript[:50]}...")
                                                        else:
                                                            logging.error(f"✗ Verification failed: transcript not found in MemoryNode {video_node['id']}")
                                                            logging.error(f"   Metadata keys: {list(verify_metadata.keys())}")
                                                    except Exception as e:
                                                        logging.error(f"✗ Error verifying metadata: {e}")
                                            else:
                                                logging.error(f"✗ Failed to update MemoryNode {video_node['id']} with transcript")
                                        else:
                                            logging.warning(f"⚠ MemoryNode not found after {max_retries} attempts. Creating new one with transcript.")
                                            try:
                                                metadata = {
                                                    "video_path": current_video_path,
                                                    "audio_path": current_audio_path,
                                                    "transcript_path": transcript_path,
                                                    "summary": None,
                                                    "transcript": transcript,
                                                    "objects_detected": [],
                                                    "description": "Recording with transcript",
                                                }
                                                node_id = create_node(
                                                    file_path=current_video_path,
                                                    file_type="recording",
                                                    timestamp=timestamp,
                                                    metadata=json.dumps(metadata)
                                                )
                                                logging.info(f"✓ Created MemoryNode {node_id} with transcript ({len(transcript)} characters)")
                                            except Exception as e:
                                                logging.error(f"✗ Failed to create MemoryNode with transcript: {e}", exc_info=True)
                                    except Exception as e:
                                        logging.error(f"✗ Error handling transcript in MemoryNode: {e}", exc_info=True)
                                elif not transcript:
                                    logging.warning(f"⚠ No transcript to store for {current_video_path}")
                                
                            except Exception as e:
                                logging.error(f"Error transcribing audio {current_audio_path}: {e}", exc_info=True)
                        
                        transcription_thread = threading.Thread(target=transcribe_and_save, daemon=True)
                        transcription_thread.start()
                    else:
                        if current_audio_path:
                            logging.warning(f"⚠ Audio file does not exist, skipping transcription: {current_audio_path}")
                        else:
                            logging.info("ℹ No audio recording available for transcription")
                    
                    if video_writer:
                        video_writer.release()
                        
                        analysis_thread = threading.Thread(
                            target=analyze_and_log_video,
                            args=(
                                current_video_path,
                                yolo_model,
                                describe_image,
                                summarize_video,
                                image_dir,
                                current_audio_path,
                                None,
                                None,
                            ),
                            daemon=True,
                        )
                        analysis_thread.start()

                        video_writer = None
                    audio_path = None
                    current_timestamp_str = None
            
            elapsed = time.monotonic() - read_start_time
            sleep_time = (1.0 / processing_fps) - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)

    finally:
        if is_recording and video_writer:
            logging.info("Finishing active recording before shutdown...")
            current_audio_path = audio_path
            current_video_path = video_path
            timestamp_for_transcript = current_timestamp_str if current_timestamp_str else datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            
            if audio_recorder and current_audio_path:
                try:
                    result, status_code = audio_recorder.stop_recording()
                    if status_code == 200:
                        logging.info(f"Audio recording stopped on exit: {current_audio_path}")
                        def transcribe_and_save():
                            try:
                                logging.info(f"Starting transcription for: {current_audio_path}")
                                transcript, timestamp = transcribe_audio(current_audio_path)
                                
                                logging.info("=" * 80)
                                logging.info(f"TRANSCRIPT FOR VIDEO: {current_video_path}")
                                logging.info("=" * 80)
                                logging.info(transcript if transcript else "[No transcript generated]")
                                logging.info("=" * 80)
                                
                                transcript_filename = f"motion_{timestamp_for_transcript}.txt"
                                transcript_path = str(transcript_dir / transcript_filename)
                                transcript_saved = save_transcript(transcript, timestamp, transcript_path)
                                
                                if transcript_saved:
                                    logging.info(f"Transcript saved: {transcript_path}")
                                else:
                                    logging.error(f"Failed to save transcript: {transcript_path}")
                                
                                title = None
                                if transcript and generate_title_fn:
                                    try:
                                        title = _generate_title_from_transcript(transcript, generate_title_fn)
                                        logging.info(f"Generated title from transcript: {title}")
                                    except Exception as e:
                                        logging.warning(f"Failed to generate title from transcript: {e}")
                                
                                if create_memory_node and current_video_path and transcript:
                                    try:
                                        from db.database import (
                                            get_memory_node_by_file_path, 
                                            update_memory_node_metadata,
                                            create_memory_node as create_node
                                        )
                                        
                                        max_retries = 15
                                        retry_delay = 2.0
                                        video_node = None
                                        
                                        logging.info(f"Looking for MemoryNode to update with transcript: {current_video_path}")
                                        
                                        for attempt in range(max_retries):
                                            video_node = get_memory_node_by_file_path(current_video_path)
                                            if video_node:
                                                logging.info(f"✓ Found MemoryNode {video_node['id']} on attempt {attempt + 1}")
                                                break
                                            if attempt < max_retries - 1:
                                                logging.debug(f"MemoryNode not found yet, waiting {retry_delay}s (attempt {attempt + 1}/{max_retries})")
                                                time.sleep(retry_delay)
                                        
                                        if video_node:
                                            try:
                                                existing_metadata = json.loads(video_node.get('metadata', '{}') or '{}')
                                            except:
                                                existing_metadata = {}
                                            
                                            existing_metadata['transcript'] = transcript
                                            existing_metadata['transcript_path'] = transcript_path
                                            existing_metadata['audio_path'] = current_audio_path
                                            
                                            if update_memory_node_metadata(video_node['id'], existing_metadata):
                                                logging.info(f"✓ Successfully updated MemoryNode {video_node['id']} with transcript ({len(transcript)} characters)")
                                        else:
                                            metadata = {
                                                    "video_path": current_video_path,
                                                    "audio_path": current_audio_path,
                                                    "transcript_path": transcript_path,
                                                    "summary": "Loading Summary...",
                                                    "transcript": transcript,
                                                    "title": title,
                                                    "objects_detected": [],
                                                    "description": "Recording with transcript",
                                                }
                                            node_id = create_node(
                                                file_path=current_video_path,
                                                file_type="recording",
                                                timestamp=timestamp,
                                                metadata=json.dumps(metadata)
                                            )
                                            logging.info(f"✓ Created MemoryNode {node_id} with transcript ({len(transcript)} characters)")
                                    except Exception as e:
                                        logging.error(f"✗ Error handling transcript in MemoryNode: {e}", exc_info=True)
                            except Exception as e:
                                logging.error(f"Error transcribing audio {current_audio_path}: {e}", exc_info=True)
                        
                        transcription_thread = threading.Thread(target=transcribe_and_save, daemon=False)
                        transcription_thread.start()
                    else:
                        logging.warning(f"Failed to stop audio recording on exit: {result.get('error', 'Unknown error')}")
                except Exception as e:
                    logging.warning(f"Error stopping audio recording on exit: {e}")
            
            if video_writer:
                video_writer.release()
                
                analysis_thread = threading.Thread(
                    target=analyze_and_log_video,
                    args=(
                        current_video_path,
                        yolo_model,
                        describe_image,
                        summarize_video,
                        image_dir,
                        current_audio_path,
                        None,
                        None,
                    ),
                    daemon=False,
                )
                analysis_thread.start()
                logging.info(f"Video analysis started for: {current_video_path}")
        
        if audio_recorder and audio_path:
            try:
                audio_recorder.stop_recording()
                logging.info("Audio recording stopped on exit")
            except Exception as e:
                logging.warning(f"Error stopping audio recording on exit: {e}")
        
        if 'cap' in locals() and cap.isOpened():
            cap.release()
        if video_writer:
            video_writer.release()
        logging.info("Camera loop stopped.")


def main(argv: Optional[List[str]] = None) -> int:
    import argparse
    logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
    
    parser = argparse.ArgumentParser(description="Run motion detection camera loop.")
    parser.add_argument("--camera-index", type=int, default=0, help="Index of the webcam.")
    parser.add_argument("--fps", type=float, default=10.0, help="Processing frames per second.")
    parser.add_argument("--min-area", type=int, default=2000, help="Minimum contour area to trigger motion.")
    parser.add_argument("--width", type=int, help="Requested capture width (pixels).")
    parser.add_argument("--height", type=int, help="Requested capture height (pixels).")
    parser.add_argument("--capture-fps", type=float, help="Requested capture FPS from the device.")
    parser.add_argument("--max-frame-failures", type=int, default=10, help="Max consecutive frame read failures.")
    parser.add_argument("--inactivity-timeout", type=float, default=5.0, help="Seconds of no motion to stop recording.")
    parser.add_argument("--delta-thresh", type=int, default=50, help="Threshold for detecting pixel changes (1-255).")
    args = parser.parse_args(argv)

    stop_event = threading.Event()
    
    def signal_handler():
        try:
            input("Press Enter or Ctrl+C to stop...\n")
        except (KeyboardInterrupt, EOFError):
            pass
        finally:
            logging.info("Stop signal received.")
            stop_event.set()

    signal_thread = threading.Thread(target=signal_handler, daemon=True)
    signal_thread.start()

    base_dir = Path(__file__).resolve().parents[1]
    image_dir = base_dir / "data" / "images"

    try:
        run_camera_loop(
            camera_index=args.camera_index,
            processing_fps=args.fps,
            min_contour_area=args.min_area,
            image_dir=image_dir,
            stop_event=stop_event,
            capture_width=args.width,
            capture_height=args.height,
            capture_fps=args.capture_fps,
            max_frame_failures=args.max_frame_failures,
            inactivity_timeout=args.inactivity_timeout,
            delta_thresh=args.delta_thresh,
        )
    except Exception as e:
        logging.critical(f"An unrecoverable error occurred: {e}", exc_info=True)
        return 1
    
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
