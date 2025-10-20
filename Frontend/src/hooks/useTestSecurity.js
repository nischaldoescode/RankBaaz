import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

export const useTestSecurity = (isTestActive, onViolation) => {
  const { logSecurityEvent } = useAuth();
  const violationsRef = useRef(0);
  const maxViolations = 3;

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && isTestActive) {
      violationsRef.current += 1;
      logSecurityEvent('tab_switch_violation', {
        violationCount: violationsRef.current,
        timestamp: Date.now()
      });

      if (violationsRef.current >= maxViolations) {
        onViolation('Too many tab switches detected');
      } else {
        onViolation(`Warning: Tab switching detected (${violationsRef.current}/${maxViolations})`);
      }
    }
  }, [isTestActive, logSecurityEvent, onViolation]);

  useEffect(() => {
    if (isTestActive) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [isTestActive, handleVisibilityChange]);

  return {
    violationCount: violationsRef.current,
    resetViolations: () => { violationsRef.current = 0; }
  };
};