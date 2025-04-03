import React, { useEffect } from 'react';

/**
 * ActivityMonitor component that silently monitors user activity
 * and reports it to Electron's main process to prevent auto-logout
 * during active use of the application.
 */
const ActivityMonitor: React.FC = () => {
  useEffect(() => {
    // Setup activity listener when component mounts
    const startActivityMonitoring = () => {
      // Define throttled reporter function to avoid excessive IPC calls
      let lastReportTime = Date.now();
      const THROTTLE_MS = 5000; // Report activity at most every 5 seconds
      
      const reportActivity = () => {
        const now = Date.now();
        if (now - lastReportTime > THROTTLE_MS) {
          lastReportTime = now;
          if (window.electronAPI) {
            window.electronAPI.reportUserActivity();
          }
        }
      };

      // Setup event listeners for user activity
      const eventTypes = ['mousemove', 'mousedown', 'click', 'keydown', 'keypress', 'scroll', 'touchstart', 'touchmove'];
      
      eventTypes.forEach(type => {
        document.addEventListener(type, reportActivity, { passive: true });
      });

      // Listen for main process signaling to start activity monitoring
      if (window.electronAPI) {
        window.electronAPI.onStartActivityMonitoring(() => {
          console.log('Activity monitoring started/refreshed');
        });
      }

      // Cleanup function to remove event listeners
      return () => {
        eventTypes.forEach(type => {
          document.removeEventListener(type, reportActivity);
        });
      };
    };

    // Start monitoring
    const cleanup = startActivityMonitoring();
    
    return cleanup;
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default ActivityMonitor;