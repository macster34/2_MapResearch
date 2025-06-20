// Popup formatting utilities for census block and demographic popups

export function formatCensusBlockPopup(props) {
  return `
    <strong>Block Group: ${props.GEOID}</strong><br/>
    Median Income: $${props.Median_HHI || 'N/A'}<br/>
    Population: ${props.SUM_TotPop || 'N/A'}<br/>
    County: ${props.COUNTY || 'N/A'}<br/>
    State: ${props.STATE || 'N/A'}<br/>
  `;
}

export function formatTop3Ethnicities(props) {
  const total = props.SUM_TotPop || 0;
  const raceFields = [
    { key: 'SUM_HispPo', label: 'Hispanic' },
    { key: 'SUM_NH_Whi', label: 'Non-Hispanic White' },
    { key: 'SUM_NH_Bla', label: 'Non-Hispanic Black' },
    { key: 'SUM_NH_Asi', label: 'Non-Hispanic Asian' },
    { key: 'SUM_NH_AmI', label: 'Non-Hispanic American Indian' },
    { key: 'SUM_NH_Haw', label: 'Non-Hispanic Hawaiian' },
    { key: 'SUM_NH_Oth', label: 'Non-Hispanic Other' },
    { key: 'SUM_NH_2or', label: 'Non-Hispanic 2+ Races' }
  ];
  const raceCounts = raceFields.map(f => ({ label: f.label, value: props[f.key] || 0 }));
  const top3 = raceCounts.sort((a, b) => b.value - a.value).slice(0, 3);
  return top3.map(r => {
    const pct = total > 0 ? ((r.value / total) * 100).toFixed(1) : '0.0';
    return `${r.label}: ${pct}% (${r.value})`;
  }).join('<br/>');
}

export function formatCensusBlockDemographicPopup(props) {
  return `
    <strong>Block Group: ${props.GEOID}</strong><br/>
    <strong>Median Income:</strong> $${props.Median_HHI || 'N/A'}<br/>
    <strong>Top 3 Race/Ethnicities:</strong><br/>
    ${formatTop3Ethnicities(props)}
  `;
} 