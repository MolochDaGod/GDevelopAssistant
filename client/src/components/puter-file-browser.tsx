import { useState, useCallback } from 'react';
import { usePuter, usePuterFiles } from '@/hooks/usePuter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Cloud, 
  CloudOff, 
  Folder, 
  File, 
  Upload, 
  Trash2, 
  RefreshCw,
  LogIn,
  LogOut,
  ChevronRight,
  Image,
  Box,
  FileAudio,
  FileVideo,
  FileText,
  ArrowLeft
} from 'lucide-react';

interface PuterFileBrowserProps {
  initialFolder?: string;
  onFileSelect?: (path: string) => void;
  allowUpload?: boolean;
  fileTypes?: string[];
}

function getFileIcon(name: string, isDir: boolean) {
  if (isDir) return <Folder className="w-5 h-5 text-yellow-500" />;
  
  const ext = name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
      return <Image className="w-5 h-5 text-green-500" />;
    case 'glb':
    case 'gltf':
    case 'fbx':
    case 'obj':
      return <Box className="w-5 h-5 text-purple-500" />;
    case 'mp3':
    case 'wav':
    case 'ogg':
      return <FileAudio className="w-5 h-5 text-blue-500" />;
    case 'mp4':
    case 'webm':
    case 'avi':
      return <FileVideo className="w-5 h-5 text-red-500" />;
    case 'json':
    case 'txt':
    case 'md':
      return <FileText className="w-5 h-5 text-gray-500" />;
    default:
      return <File className="w-5 h-5 text-muted-foreground" />;
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PuterFileBrowser({
  initialFolder = 'assets',
  onFileSelect,
  allowUpload = true,
  fileTypes,
}: PuterFileBrowserProps) {
  const { isAvailable, isSignedIn, isLoading: authLoading, user, signIn, signOut, initializeStorage } = usePuter();
  const [currentFolder, setCurrentFolder] = useState(initialFolder);
  const { files, isLoading, error, refresh, uploadFile, deleteFile } = usePuterFiles(currentFolder);
  const [uploading, setUploading] = useState(false);

  const handleSignIn = async () => {
    try {
      await initializeStorage();
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(selectedFiles)) {
        await uploadFile(file);
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [uploadFile]);

  const handleFileClick = (file: { name: string; path: string; isDir: boolean }) => {
    if (file.isDir) {
      setCurrentFolder(prev => `${prev}/${file.name}`);
    } else {
      onFileSelect?.(file.path);
    }
  };

  const handleBack = () => {
    const parts = currentFolder.split('/');
    if (parts.length > 1) {
      parts.pop();
      setCurrentFolder(parts.join('/'));
    }
  };

  const breadcrumbs = currentFolder.split('/').filter(Boolean);

  if (!isAvailable) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
          <CloudOff className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">Puter SDK loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (authLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Connecting to GRUDA Cloud...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isSignedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            GRUDA Cloud Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Sign in to access your cloud files</p>
            <p className="text-sm text-muted-foreground">Powered by Puter</p>
          </div>
          <Button onClick={handleSignIn} size="lg">
            <LogIn className="w-4 h-4 mr-2" />
            Sign In to GRUDA Cloud
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            GRUDA Cloud
          </CardTitle>
          <div className="flex items-center gap-2">
            {user && (
              <Badge variant="secondary">{user.username}</Badge>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} data-testid="button-signout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2"
            onClick={() => setCurrentFolder(initialFolder)}
            data-testid="button-root"
          >
            GRUDA
          </Button>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              <span>{crumb}</span>
            </span>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          {currentFolder !== initialFolder && (
            <Button variant="outline" size="sm" onClick={handleBack} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refresh}
            disabled={isLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {allowUpload && (
            <label className="cursor-pointer">
              <Input
                type="file"
                className="hidden"
                multiple
                accept={fileTypes?.join(',')}
                onChange={handleUpload}
                disabled={uploading}
                data-testid="input-upload"
              />
              <Button variant="default" size="sm" disabled={uploading} asChild>
                <span>
                  <Upload className="w-4 h-4 mr-1" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </span>
              </Button>
            </label>
          )}
        </div>

        {error && (
          <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
            {error}
          </div>
        )}

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Folder className="w-12 h-12 mb-2 opacity-50" />
              <p>No files in this folder</p>
            </div>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer group"
                  onClick={() => handleFileClick(file)}
                  data-testid={`file-item-${file.name}`}
                >
                  {getFileIcon(file.name, file.isDir)}
                  <span className="flex-1 truncate">{file.name}</span>
                  {file.size && (
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  )}
                  {!file.isDir && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFile(file.path);
                      }}
                      data-testid={`button-delete-${file.name}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default PuterFileBrowser;
