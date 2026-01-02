import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

export type PolylineProps = google.maps.PolylineOptions & {
  path?: google.maps.LatLng[] | google.maps.LatLngLiteral[];
  onClick?: (e: google.maps.MapMouseEvent) => void;
  onDrag?: (e: google.maps.MapMouseEvent) => void;
  onDragStart?: (e: google.maps.MapMouseEvent) => void;
  onDragEnd?: (e: google.maps.MapMouseEvent) => void;
  onMouseOver?: (e: google.maps.MapMouseEvent) => void;
  onMouseOut?: (e: google.maps.MapMouseEvent) => void;
};

export type PolylineRef = {
  polyline: google.maps.Polyline | null;
};

export const Polyline = forwardRef<PolylineRef, PolylineProps>((props, ref) => {
  const {
    path,
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    onMouseOver,
    onMouseOut,
    ...polylineOptions
  } = props;
  
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useImperativeHandle(ref, () => ({
    polyline: polylineRef.current
  }));

  useEffect(() => {
    if (!map) return;

    polylineRef.current = new google.maps.Polyline({
      ...polylineOptions,
      path,
      map
    });

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map]);

  useEffect(() => {
    if (!polylineRef.current) return;
    polylineRef.current.setOptions(polylineOptions);
  }, [polylineOptions]);

  useEffect(() => {
    if (!polylineRef.current) return;
    // `Polyline.setPath` only accepts `LatLng[]` / `MVCArray<LatLng>` but our code frequently
    // passes `LatLngLiteral[]`. `setOptions` supports the full `PolylineOptions.path` union.
    polylineRef.current.setOptions({ path: path || [] });
  }, [path]);

  useEffect(() => {
    if (!polylineRef.current) return;

    const listeners: google.maps.MapsEventListener[] = [];

    if (onClick) listeners.push(polylineRef.current.addListener('click', onClick));
    if (onDrag) listeners.push(polylineRef.current.addListener('drag', onDrag));
    if (onDragStart) listeners.push(polylineRef.current.addListener('dragstart', onDragStart));
    if (onDragEnd) listeners.push(polylineRef.current.addListener('dragend', onDragEnd));
    if (onMouseOver) listeners.push(polylineRef.current.addListener('mouseover', onMouseOver));
    if (onMouseOut) listeners.push(polylineRef.current.addListener('mouseout', onMouseOut));

    return () => {
      listeners.forEach(l => l.remove());
    };
  }, [onClick, onDrag, onDragStart, onDragEnd, onMouseOver, onMouseOut]);

  return null;
});

Polyline.displayName = 'Polyline';
