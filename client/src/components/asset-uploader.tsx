import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

type AssetType = "sprite" | "3d-model" | "background" | "tileset" | "sound" | "shader" | "texture";

interface AssetUploadProps {
  onUploadComplete?: (assetData: {
    publicURL: string;
    publicPath: string;
    fileName: string;
  }) => void;
}

export function AssetUploader({ onUploadComplete }: AssetUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("sprite");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!assetName) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        setAssetName(nameWithoutExt.replace(/_/g, " "));
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    if (!assetName.trim()) {
      toast({
        title: "Asset name required",
        description: "Please enter a name for this asset",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      setUploadStatus("uploading");
      setUploadProgress(10);

      // Step 1: Get presigned upload URL from server
      const uploadUrlResponse = await fetch("/api/assets/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type
        })
      });

      if (!uploadUrlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL, publicPath, publicURL } = await uploadUrlResponse.json();
      setUploadProgress(30);

      // Step 2: Upload file directly to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      setUploadProgress(60);

      // Step 3: Create asset metadata in database - REQUIRED FOR SUCCESS
      const createAssetResponse = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: assetName.trim(),
          type: assetType,
          category: "User Uploads",
          source: "user_upload",
          sourceUrl: publicURL,
          previewUrl: publicURL,
          tags: [assetType, "user-upload"],
          description: `User uploaded ${assetType}: ${assetName}`
        })
      });

      if (!createAssetResponse.ok) {
        const errorText = await createAssetResponse.text();
        throw new Error(`Failed to save asset metadata to database: ${errorText || createAssetResponse.statusText}`);
      }

      const savedAsset = await createAssetResponse.json();
      console.log("Asset metadata saved to database:", savedAsset);

      setUploadProgress(90);

      // Step 4: Notify parent component
      if (onUploadComplete) {
        onUploadComplete({
          publicURL,
          publicPath,
          fileName: file.name
        });
      }

      setUploadProgress(100);
      setUploadStatus("success");

      toast({
        title: "Upload successful",
        description: `${assetName} has been uploaded successfully`
      });

      // Reset form after success
      setTimeout(() => {
        setFile(null);
        setAssetName("");
        setUploadProgress(0);
        setUploadStatus("idle");
      }, 2000);

    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const getContentTypeIcon = (type: AssetType) => {
    const icons = {
      "sprite": "🎨",
      "3d-model": "🧊",
      "background": "🖼️",
      "tileset": "🧩",
      "sound": "🔊",
      "shader": "✨",
      "texture": "🎭"
    };
    return icons[type] || "📁";
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Asset to Object Storage
        </CardTitle>
        <CardDescription>
          Upload game assets (images, 3D models, shaders) to Replit Object Storage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Input */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select File</Label>
          <Input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            disabled={uploading}
            accept="image/*,.fbx,.gltf,.glb,.obj,.glsl,.hlsl,.mp3,.wav,.ogg"
            data-testid="input-asset-file"
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Asset Name */}
        <div className="space-y-2">
          <Label htmlFor="asset-name">Asset Name</Label>
          <Input
            id="asset-name"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            placeholder="e.g., Medieval Knight Sprite"
            disabled={uploading}
            data-testid="input-asset-name"
          />
        </div>

        {/* Asset Type */}
        <div className="space-y-2">
          <Label htmlFor="asset-type">Asset Type</Label>
          <Select value={assetType} onValueChange={(value) => setAssetType(value as AssetType)} disabled={uploading}>
            <SelectTrigger id="asset-type" data-testid="select-asset-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sprite">
                <span className="flex items-center gap-2">
                  {getContentTypeIcon("sprite")} Sprite / Image
                </span>
              </SelectItem>
              <SelectItem value="3d-model">
                <span className="flex items-center gap-2">
                  {getContentTypeIcon("3d-model")} 3D Model
                </span>
              </SelectItem>
              <SelectItem value="background">
                <span className="flex items-center gap-2">
                  {getContentTypeIcon("background")} Background
                </span>
              </SelectItem>
              <SelectItem value="tileset">
                <span className="flex items-center gap-2">
                  {getContentTypeIcon("tileset")} Tileset
                </span>
              </SelectItem>
              <SelectItem value="sound">
                <span className="flex items-center gap-2">
                  {getContentTypeIcon("sound")} Sound / Music
                </span>
              </SelectItem>
              <SelectItem value="shader">
                <span className="flex items-center gap-2">
                  {getContentTypeIcon("shader")} Shader
                </span>
              </SelectItem>
              <SelectItem value="texture">
                <span className="flex items-center gap-2">
                  {getContentTypeIcon("texture")} Texture Map
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Upload Progress */}
        {uploadStatus !== "idle" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {uploadStatus === "uploading" && "Uploading..."}
                {uploadStatus === "success" && (
                  <span className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Upload complete!
                  </span>
                )}
                {uploadStatus === "error" && (
                  <span className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    Upload failed
                  </span>
                )}
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || !assetName.trim() || uploading}
          className="w-full"
          size="lg"
          data-testid="button-upload-asset"
        >
          {uploading ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-pulse" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload to Object Storage
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t">
          <p className="font-medium">How it works:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Server generates a secure presigned upload URL</li>
            <li>File uploads directly to Replit Object Storage</li>
            <li>Asset metadata saved to PostgreSQL database</li>
            <li>Asset becomes accessible via <code className="text-xs bg-muted px-1 py-0.5 rounded">/public-objects/</code> URL</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
