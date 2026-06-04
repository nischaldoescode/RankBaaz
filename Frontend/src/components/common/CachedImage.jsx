/**
 * keeps the cached image component focused and readable.
 */
import React, { useState, useEffect } from 'react';
import { cacheManager } from '../../utils/cacheManager';

/**
 * image component that uses indexeddb cache
 * falls back to normal img if cache unavailable
 */
const CachedImage = ({
  src,
  alt,
  className = '',
  fallback = null,
  onLoad,
  onError,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let objectUrl = null;

    const loadImage = async () => {
      if (!src) {
        setLoading(false);
        setError(true);
        return;
      }

      try {
        // try to get from cache first
        const cachedBlob = await cacheManager.getImage(src);

        if (cachedBlob && mounted) {
          // create object url from cached blob
          objectUrl = URL.createObjectURL(cachedBlob);
          setImageSrc(objectUrl);
          setLoading(false);
          setError(false);
          return;
        }

        // if not in cache, use original url (will be cached by sw)
        if (mounted) {
          setImageSrc(src);
          setLoading(false);
        }

        // try to cache it for next time
        cacheManager.cacheImage(src).catch(err => {
          console.error('[CachedImage] Failed to cache:', err);
        });

      } catch (err) {
        console.error('[CachedImage] Load error:', err);
        if (mounted) {
          setImageSrc(src); // fallback to direct url
          setLoading(false);
        }
      }
    };

    loadImage();

    // cleanup
    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  const handleLoad = (e) => {
    setLoading(false);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setError(true);
    setLoading(false);
    if (onError) onError(e);
  };

  if (error && fallback) {
    return fallback;
  }

  if (!imageSrc) {
    return null;
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
};

export default CachedImage;