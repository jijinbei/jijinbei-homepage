import React from "react";
import ThreeFishScene from "./components/ThreeFishScene";
import WebGPUStatusIndicator from "./components/WebGPUStatusIndicator";
import SocialLinks from "./components/SocialLinks";

function App() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <ThreeFishScene />
      <WebGPUStatusIndicator />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center space-y-8">
          <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            JIJINBEI
          </h1>
          <SocialLinks />
        </div>
      </div>
    </div>
  );
}

export default App;
