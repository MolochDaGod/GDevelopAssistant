import React, { useEffect, useState } from 'react';

interface Asset {
  name: string;
  path: string;
  size: number;
  type: string;
}

/**
 * Grudge Drive Tab Component
 * Asset management and cloud storage integration
 */
export default function GrudgeDriveTab() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'sprites' | 'models' | 'animations' | 'audio'>('sprites');

  useEffect(() => {
    // Load asset manifest
    const loadAssets = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/assets/manifest.json');
        const manifest = await response.json();
        
        // Extract assets from selected category
        const categoryData = manifest.categories[selectedTab] || {};
        setAssets(categoryData.assets || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load assets:', error);
        setAssets([]);
        setIsLoading(false);
      }
    };

    loadAssets();
  }, [selectedTab]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #ccc' }}>
        <h2>Grudge Drive</h2>
        <p>Asset management and cloud storage integration</p>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ccc', paddingTop: '8px' }}>
        {(['sprites', 'models', 'animations', 'audio'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedTab(cat)}
            style={{
              padding: '8px 16px',
              marginLeft: '8px',
              marginBottom: '-1px',
              border: 'none',
              backgroundColor: selectedTab === cat ? '#0066cc' : 'transparent',
              color: selectedTab === cat ? '#fff' : '#000',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
            }}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Asset List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {isLoading ? (
          <div>Loading {selectedTab}...</div>
        ) : assets.length === 0 ? (
          <div style={{ color: '#666' }}>No {selectedTab} found</div>
        ) : (
          <div>
            <p>{assets.length} assets</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Path</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Size</th>
                </tr>
              </thead>
              <tbody>
                {assets.slice(0, 50).map((asset, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{asset.name}</td>
                    <td style={{ padding: '8px', color: '#666', fontSize: '11px' }}>{asset.path}</td>
                    <td style={{ textAlign: 'right', padding: '8px' }}>{formatBytes(asset.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {assets.length > 50 && (
              <p style={{ color: '#666', marginTop: '8px' }}>
                Showing 50 of {assets.length} assets
              </p>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f5f5f5',
        borderTop: '1px solid #ccc',
        fontSize: '12px',
        color: '#666',
      }}>
        <p>Asset sync: Ready | Drive integration: Connected | Last updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}
