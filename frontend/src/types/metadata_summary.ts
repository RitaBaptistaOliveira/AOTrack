
interface TimeDict {
  timestamps: number[];
  frame_numbers: number[];
}

interface AtmosphericParameter {
  uid: string;
  time: TimeDict | null;
}

interface WavefrontSensor {
  uid: string;
  source: Source | null;
  n_valid_subapertures: number;
  subaperture_size: number;
  wavelength: number;
}

interface WavefrontCorrector {
  uid: string;
  telescope: string | null;
  n_valid_actuators: number;
}

interface Loop {
  uid: string;
  wfc: string | null;
  closed: boolean;
  time: TimeDict | null;
  framerate: number;
  delay: number;
}

interface Source {
  uid: string;
}

export interface MetadataSummary {
  telescope_name: string | null;
  system_name: string | null;
  mode: string | null;
  start_date: string | null;
  end_date: string | null;
  recording_time: number | null; // seconds
  strehl_ratio: number | null;
  config: string | null;
  strehl_wavelength: number | null;

  num_params: number;
  atmospheric_parameters: AtmosphericParameter[];

  num_wfs: number;
  wavefront_sensors: WavefrontSensor[];

  num_correctors: number;
  wavefront_correctors: WavefrontCorrector[];

  num_loops: number;
  loops: Loop[];

  num_sources: number;
  sources: Source[];
}