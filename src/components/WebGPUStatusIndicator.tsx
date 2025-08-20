import React, { useState, useEffect } from "react";
import { checkWebGPUSupport } from "../webgpu-utils";

const WebGPUStatusIndicator = () => {
  const [webgpuStatus, setWebgpuStatus] = useState<string>("Checking...");

  useEffect(() => {
    checkWebGPUSupport().then((support) => {
      if (support.supported) {
        setWebgpuStatus("🚀 WebGPU Active");
      } else {
        setWebgpuStatus("⚙️ WebGL Fallback");
      }
    });
  }, []);

  return (
    <div className="fixed top-4 right-4 z-20 bg-black/50 backdrop-blur-sm border border-gray-600 rounded-lg px-3 py-2 text-sm">
      {webgpuStatus}
    </div>
  );
};

export default WebGPUStatusIndicator;
