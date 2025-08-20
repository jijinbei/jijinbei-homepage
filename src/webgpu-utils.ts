export interface WebGPUSupport {
  supported: boolean;
  adapter?: GPUAdapter;
  device?: GPUDevice;
  reason?: string;
}

export async function checkWebGPUSupport(): Promise<WebGPUSupport> {
  if (!navigator.gpu) {
    return {
      supported: false,
      reason: 'WebGPU not available in this browser'
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        reason: 'No suitable GPU adapter found'
      };
    }

    const device = await adapter.requestDevice();
    return {
      supported: true,
      adapter,
      device
    };
  } catch (error) {
    return {
      supported: false,
      reason: `WebGPU initialization failed: ${error}`
    };
  }
}

export function logWebGPUCapabilities(adapter: GPUAdapter, device: GPUDevice) {
  console.log('WebGPU Adapter Info:', {
    vendor: adapter.info?.vendor,
    architecture: adapter.info?.architecture,
    device: adapter.info?.device,
    description: adapter.info?.description
  });

  console.log('WebGPU Device Limits:', device.limits);
  console.log('WebGPU Device Features:', Array.from(device.features));
}