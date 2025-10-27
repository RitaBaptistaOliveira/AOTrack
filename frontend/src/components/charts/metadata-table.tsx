import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { useAoSession } from "@/contexts/ao-session-context"

export default function MetadataTable() {
  const { metadataSummary } = useAoSession()

  if (!metadataSummary) {
    return null
  }
  
  return (
    <Table>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">Telescope</TableCell>
          <TableCell>{metadataSummary.telescope_name ?? "—"}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">System</TableCell>
          <TableCell>{metadataSummary.system_name ?? "—"}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Mode</TableCell>
          <TableCell>{metadataSummary.mode ?? "—"}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Start Date</TableCell>
          <TableCell>{metadataSummary.start_date ?? "—"}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">End Date</TableCell>
          <TableCell>{metadataSummary.end_date ?? "—"}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Recording Time (s)</TableCell>
          <TableCell>{metadataSummary.recording_time ?? "—"}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Strehl Ratio</TableCell>
          <TableCell>
            {metadataSummary.strehl_ratio
              ? metadataSummary.strehl_ratio.toFixed(3)
              : "—"}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Strehl Wavelength (nm)</TableCell>
          <TableCell>{metadataSummary.strehl_wavelength ?? "—"}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Configuration</TableCell>
          <TableCell>{metadataSummary.config ?? "—"}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium"># Atmospheric Parameters</TableCell>
          <TableCell>{metadataSummary.num_params}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium"># Wavefront Sensors</TableCell>
          <TableCell>{metadataSummary.num_wfs}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium"># Wavefront Correctors</TableCell>
          <TableCell>{metadataSummary.num_correctors}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium"># Loops</TableCell>
          <TableCell>{metadataSummary.num_loops}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium"># Sources</TableCell>
          <TableCell>{metadataSummary.num_sources}</TableCell>
        </TableRow>

        {/* Atmospheric Parameters */}
        {metadataSummary.atmospheric_parameters?.length > 0 && (
          <TableRow>
            <TableCell className="font-medium align-top">Atmospheric Parameters</TableCell>
            <TableCell>
              <ul className="list-disc ml-4">
                {metadataSummary.atmospheric_parameters.map((p) => (
                  <li key={p.uid}>
                    <span className="font-medium">{p.uid}</span>{" "}
                    {p.time
                      ? `(timestamps: ${p.time.timestamps.length}, frames: ${p.time.frame_numbers.length})`
                      : "(no time data)"}
                  </li>
                ))}
              </ul>
            </TableCell>
          </TableRow>
        )}

        {/* Wavefront Sensors */}
        {metadataSummary.wavefront_sensors?.length > 0 && (
          <TableRow>
            <TableCell className="font-medium align-top">Wavefront Sensors</TableCell>
            <TableCell>
              <ul className="list-disc ml-4">
                {metadataSummary.wavefront_sensors.map((wfs) => (
                  <li key={wfs.uid}>
                    <div className="space-y-1">
                      <div><span className="font-medium">UID:</span> {wfs.uid}</div>
                      <div>Source: {wfs.source?.uid ?? "—"}</div>
                      <div>Valid Subapertures: {wfs.n_valid_subapertures}</div>
                      <div>Subaperture Size: {wfs.subaperture_size}</div>
                      <div>Wavelength: {wfs.wavelength}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </TableCell>
          </TableRow>
        )}

        {/* Wavefront Correctors */}
        {metadataSummary.wavefront_correctors?.length > 0 && (
          <TableRow>
            <TableCell className="font-medium align-top">Wavefront Correctors</TableCell>
            <TableCell>
              <ul className="list-disc ml-4">
                {metadataSummary.wavefront_correctors.map((wfc) => (
                  <li key={wfc.uid}>
                    <div className="space-y-1">
                      <div><span className="font-medium">UID:</span> {wfc.uid}</div>
                      <div>Telescope: {wfc.telescope ?? "—"}</div>
                      <div>Valid Actuators: {wfc.n_valid_actuators}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </TableCell>
          </TableRow>
        )}

        {/* Loops */}
        {metadataSummary.loops?.length > 0 && (
          <TableRow>
            <TableCell className="font-medium align-top">Loops</TableCell>
            <TableCell>
              <ul className="list-disc ml-4">
                {metadataSummary.loops.map((loop) => (
                  <li key={loop.uid}>
                    <div className="space-y-1">
                      <div><span className="font-medium">UID:</span> {loop.uid}</div>
                      <div>WFC: {loop.wfc ?? "—"}</div>
                      <div>Closed: {loop.closed ? "Yes" : "No"}</div>
                      <div>Framerate: {loop.framerate}</div>
                      <div>Delay: {loop.delay}</div>
                      {loop.time && (
                        <div>
                          Time: {loop.time.timestamps.length} timestamps,{" "}
                          {loop.time.frame_numbers.length} frames
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </TableCell>
          </TableRow>
        )}

        {/* Sources */}
        {metadataSummary.sources?.length > 0 && (
          <TableRow>
            <TableCell className="font-medium align-top">Sources</TableCell>
            <TableCell>
              <ul className="list-disc ml-4">
                {metadataSummary.sources.map((src) => (
                  <li key={src.uid}>{src.uid}</li>
                ))}
              </ul>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
