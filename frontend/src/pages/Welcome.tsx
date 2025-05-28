import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { UploadCloud, ArrowDown } from "lucide-react";
import { ROUTE_PATHS } from "../routes";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BackgroundParticles } from "@/components/background-particles";
import { useAoHelper } from "@/hooks/use_ao_helper";
import { useAoSession } from "@/contexts/ao_session_context";

export default function Welcome() {

    const { uploadFile } = useAoHelper();
    const { fileName, fileSize, metadataSummary } = useAoSession();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("local")
    const [fileUploaded, setFileUploaded] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const uploaderRef = useRef<HTMLDivElement | null>(null);
    const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setDragging(false);
        const selected = e.dataTransfer.files?.[0];
        if (selected && selected.name.endsWith(".fits")) {
            setIsUploading(true);
            try {
                await uploadFile(selected);
                setFileUploaded(true);
            } catch (err) {
                alert("Upload failed.");
            } finally {
                setIsUploading(false);
            }
        } else {
            alert("Only .fits files are accepted.");
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected && selected.name.endsWith(".fits")) {
            setIsUploading(true);
            setUploadError(null);
            try {
                await uploadFile(selected);
                setFileUploaded(true);
            } catch (err) {
                setUploadError("Upload failed. Please try again. Error " + (err instanceof Error ? `${err.name}: ${err.message}` : ""));
            } finally {
                setIsUploading(false);
            }
        } else {
            setUploadError("Only .fits files are accepted.");
        }
    };

    const MemoizedParticles = useMemo(() => {
        return (
            <BackgroundParticles />
        );
    }, []);

    return (
        <div className="relative min-h-screen bg-[#14213D] overflow-auto text-white">
            {/* Particles background */}
            {MemoizedParticles}

            {/* Content layout */}
            <div className="relative flex flex-col md:flex-row min-h-screen items-center md:items-stretch justify-center z-10">
                {/* Left: Welcome Text */}
                <div className="w-full md:w-1/2 flex items-center justify-center p-6">
                    <div className="text-center">
                        <h1 className="text-3xl text-white font-medium mb-2">Welcome to</h1>
                        <h2 className="text-6xl font-extrabold tracking-tight text-yellow-400 mb-8">
                            AOTrack
                        </h2>
                        <div className="flex justify-center my-6 md:hidden">
                            <Button
                                onClick={() => {
                                    uploaderRef.current?.scrollIntoView({ behavior: "smooth" });
                                }}
                            >
                                <ArrowDown className="text-fr-primary" />
                                Jump to File Upload
                            </Button>
                        </div>

                        <p className="text-lg text-white/90 max-w-xl mx-auto leading-relaxed mb-6">
                            AOTrack is your gateway to exploring and analyzing complex Adaptive Optics Telemetry (AOT) data — no programming required.
                        </p>

                        <p className="text-lg text-white/80 max-w-xl mx-auto leading-relaxed mb-6">
                            Whether you're working with SCAO, GLAO, or MCAO systems, our intuitive interface adapts to your data, giving you fast, flexible insights.
                        </p>

                        <p className="text-lg text-white/80 max-w-xl mx-auto leading-relaxed mb-6">
                            AO telemetry files often hold rich information, but navigating their complexity can be time-consuming. AOTrack bridges that gap with a visual, user-friendly approach tailored for researchers and engineers alike.
                        </p>

                        <p className="text-lg text-white/80 max-w-xl mx-auto leading-relaxed mb-6">
                            Upload your local telemetry files or connect directly to the ESO Science Archive. AOTrack supports flexible inputs and offers structured data views for both quick analysis and deep dives.
                        </p>

                        <p className="text-lg text-white/80 max-w-xl mx-auto leading-relaxed mb-6">
                            From basic signal inspection to detailed statistical summaries and pixel-level insights, AOTrack makes your workflow smoother, faster, and more transparent.
                        </p>

                        <p className="text-lg text-white/80 max-w-xl mx-auto leading-relaxed">
                            Dive in and experience a new standard in AO telemetry exploration — built for clarity, precision, and speed.
                        </p>
                    </div>
                </div>

                {/* Right: Card with Tabs */}
                <div className="w-full md:w-1/2 flex items-center justify-center p-6" ref={uploaderRef}>
                    <Card className="w-full max-w-md md:max-w-lg lg:max-w-xl bg-[#1f2a48] border-none text-white min-h-[550px] flex flex-col">
                        <CardContent className="flex-1 flex flex-col px-4">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">

                                {/* Make TabsList full width and flex so buttons share space */}
                                <TabsList className="grid w-full grid-cols-2 relative bg-transparent h-auto px-4 gap-4">
                                    {/* Sliding underline indicator */}
                                    <div
                                        className={`absolute bottom-0 h-0.5 bg-accent transition-transform duration-300 ease-out ${activeTab === "local"
                                            ? "translate-x-4 w-[calc(50%-1.5rem)]"
                                            : "translate-x-[calc(100%+2rem)] w-[calc(50%-1.5rem)]"
                                            }`}
                                    />

                                    <TabsTrigger
                                        value="local"
                                        className="relative text-primary bg-transparent border-0 data-[state=active]:bg-transparent rounded-none pb-3 font-medium"
                                    >
                                        Local Files
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="eso"
                                        className="relative text-primary bg-transparent border-0 data-[state=active]:bg-transparent = rounded-none pb-3 font-medium"
                                    >
                                        ESO Science Archive
                                    </TabsTrigger>
                                </TabsList>

                                {/* TabsContent fills remaining space, flex and centered */}
                                <TabsContent
                                    value="local"
                                    className="flex-1 w-full flex p-4 flex-col overflow-auto"
                                >
                                    {!fileUploaded ? (
                                        isUploading ? (
                                            <div className="flex flex-col items-center justify-center flex-1 gap-4">
                                                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <p className="text-sm text-white">Uploading...</p>
                                            </div>
                                        ) : (
                                            < label
                                                htmlFor="file-upload"
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    setDragging(true);
                                                }}
                                                onDragLeave={(e) => {
                                                    e.preventDefault();
                                                    setDragging(false);
                                                }}
                                                onDrop={handleDrop}
                                                className={`w-full flex-1 flex flex-col border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${dragging ? "border-blue-400 bg-white/10" : "border-gray-400 hover:bg-white/5"}`}
                                            >
                                                <div className="flex flex-col items-center justify-center flex-grow">
                                                    <UploadCloud className="h-12 w-12 mb-4 text-white" />
                                                    <p className="text-white text-sm">Drag and drop</p>
                                                    <p className="text-white text-sm">or</p>
                                                    <p className="text-white text-sm">Click to upload</p>
                                                    <input
                                                        id="file-upload"
                                                        type="file"
                                                        accept=".fits"
                                                        className="hidden"
                                                        onChange={handleFileChange}
                                                    />
                                                </div>

                                                <div className="mt-auto min-h-[1.5rem]">
                                                    {uploadError && (
                                                        <p className="text-red-400 text-center font-semibold">{uploadError}</p>
                                                    )}
                                                </div>
                                            </label>
                                        )
                                    ) : (
                                        metadataSummary && (
                                            <div className="space-y-4 w-full flex flex-col justify-between flex-1">
                                                <table className="w-full text-sm text-white border-separate border-spacing-y-2">
                                                    <tbody>
                                                        <tr>
                                                            <td className="font-medium">Telescope Name</td>
                                                            <td>{metadataSummary.telescope_name || "–"}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="font-medium">System Name</td>
                                                            <td>{metadataSummary.system_name || "–"}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="font-medium">Mode</td>
                                                            <td>{metadataSummary.mode || "–"}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="font-medium">Start Date</td>
                                                            <td>{metadataSummary.start_date || "–"}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="font-medium">End Date</td>
                                                            <td>{metadataSummary.end_date || "–"}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="font-medium">Recording Time</td>
                                                            <td>{metadataSummary.recording_time || "–"}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>

                                                <p className="text-sm text-muted-foreground">
                                                    <span className="font-semibold text-white">{fileName} uploaded successfully</span>
                                                    <br />
                                                    <span className="text-xs text-white/70">
                                                        File size: {((fileSize ?? 0) / (1024 * 1024)).toFixed(2)} MB
                                                    </span>
                                                </p>

                                                <div className="grid w-full grid-cols-2 relative gap-4">
                                                    {/* Buttons fill width equally */}
                                                    <Button onClick={() => navigate(ROUTE_PATHS.overview)} className="flex-1 text-accent-foreground bg-accent hover:bg-accent/70">
                                                        Proceed
                                                    </Button>
                                                    <label htmlFor="file-upload" className="flex-1">
                                                        <Button
                                                            variant="outline"
                                                            className="w-full bg-transparent hover:text-white hover:bg-white/10 border-white/30 hover:border-white/50"
                                                            onClick={() => fileInputRef.current?.click()}
                                                        >
                                                            Change File
                                                        </Button>
                                                        <input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            accept=".fits"
                                                            className="hidden"
                                                            onChange={handleFileChange}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </TabsContent>

                                <TabsContent
                                    value="eso"
                                    className="flex-1 w-full flex p-4 flex-col justify-center items-center overflow-auto"
                                >
                                    <p className="text-sm text-muted-foreground mb-2 text-center w-full max-w-lg">
                                        Connect to the ESO Science Archive using your dataset query.
                                    </p>
                                    {/* Placeholder: Add query fields later */}
                                    <Input placeholder="Enter query or dataset ID..." className="bg-white text-black w-full max-w-lg" />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    );
}
