import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { Box, IconButton, Typography } from '@mui/material';
import { styled } from '@mui/system';
import React, { useEffect, useState } from 'react';

// Style the controls to be fixed in the bottom right corner
const ZoomControlsWrapper = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  padding: theme.spacing(0.5),
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)', // Use explicit shadow instead of theme.shadows
}));

const ZoomControls: React.FC = () => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isElectron, setIsElectron] = useState<boolean>(false);
  
  // Check if running in Electron and initialize zoom level on component mount
  useEffect(() => {
    // Check if we're running in Electron
    setIsElectron(!!window.electronAPI);
    
    const initZoomLevel = async () => {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.getZoomLevel();
          if (result.success) {
            setZoomLevel(result.zoomFactor);
          }
        }
      } catch (error) {
        console.error('Failed to get zoom level:', error);
      }
    };
    
    initZoomLevel();
  }, []);

  const handleZoomIn = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.zoomIn();
        if (result.success) {
          setZoomLevel(result.zoomFactor);
        }
      }
    } catch (error) {
      console.error('Failed to zoom in:', error);
    }
  };

  const handleZoomOut = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.zoomOut();
        if (result.success) {
          setZoomLevel(result.zoomFactor);
        }
      }
    } catch (error) {
      console.error('Failed to zoom out:', error);
    }
  };

  // Don't render the component if not running in Electron
  if (!isElectron) {
    return null;
  }

  return (
    <ZoomControlsWrapper>
      <IconButton 
        onClick={handleZoomOut} 
        aria-label="Zoom out"
        color="primary"
        size="large"
      >
        <ZoomOutIcon />
      </IconButton>
      <Typography variant="body2" sx={{ mx: 1 }}>
        {Math.round(zoomLevel * 100)}%
      </Typography>
      <IconButton 
        onClick={handleZoomIn} 
        aria-label="Zoom in"
        color="primary"
        size="large"
      >
        <ZoomInIcon />
      </IconButton>
    </ZoomControlsWrapper>
  );
};

export default ZoomControls;