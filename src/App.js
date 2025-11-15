import React from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="min-h-screen bg-primary-50 flex flex-col">
      <Header />
      <main className="flex-grow flex justify-center items-center">
        <div className="bg-white p-8 border border-primary-100 w-[80vw] h-[80vh]">
          <h1 className="text-4xl font-bold text-primary-800 mb-4">HI</h1>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
