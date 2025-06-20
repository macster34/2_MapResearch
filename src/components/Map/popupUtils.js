// Utility functions for creating map popups for Community Centers and Floodplain Distance
import mapboxgl from 'mapbox-gl';

export function createCommunityCenterPopup(map, lngLat, props) {
  new mapboxgl.Popup({ closeOnClick: true })
    .setLngLat(lngLat)
    .setHTML(`
      <div style="min-width:220px">
        <h3 style="margin:0 0 4px 0; color:#FF00B7">${props.Name || ''}</h3>
        <div><b>Address:</b> ${props.Address || ''}, ${props.Zip_Code || ''}</div>
        <div><b>Phone:</b> ${props.Phone || ''}</div>
        <div><b>Supervisor:</b> ${props.SUPERVISOR || ''}</div>
      </div>
    `)
    .addTo(map);
}

export function createFloodplainDistancePopup(map, lngLat, distanceMiles) {
  new mapboxgl.Popup({ closeOnClick: false, offset: 12 })
    .setLngLat(lngLat)
    .setHTML(
      `<div style='min-width:180px'>` +
      `<h3 style='margin:0 0 4px 0; color:#00BFFF'>Distance to Floodplain</h3>` +
      `<div><b>Distance:</b> ${distanceMiles !== null ? distanceMiles + ' miles' : 'N/A'}</div>` +
      `</div>`
    )
    .addTo(map);
} 