// Shared cities list for autocomplete across the application
// TODO: In the future, this should be fetched from the backend based on registered branches/tenants

export interface City {
  value: string;
  label: string;
}

export const cities: City[] = [
  { value: 'Tirana', label: 'Tirana' },
  { value: 'Durres', label: 'Durrës' },
  { value: 'Vlora', label: 'Vlorë' },
  { value: 'Shkoder', label: 'Shkodër' },
  { value: 'Elbasan', label: 'Elbasan' },
  { value: 'Fier', label: 'Fier' },
  { value: 'Korce', label: 'Korçë' },
  { value: 'Berat', label: 'Berat' },
  { value: 'Saranda', label: 'Sarandë' },
  { value: 'Gjirokaster', label: 'Gjirokastër' },
  { value: 'Lushnje', label: 'Lushnjë' },
  { value: 'Pogradec', label: 'Pogradec' },
  { value: 'Kavaje', label: 'Kavajë' },
  { value: 'Lezhe', label: 'Lezhë' },
  { value: 'Kukes', label: 'Kukës' },
  { value: 'Peshkopi', label: 'Peshkopi' },
  { value: 'Permet', label: 'Përmet' },
  { value: 'Tepelene', label: 'Tepelenë' },
  { value: 'Kruje', label: 'Krujë' },
  { value: 'Puke', label: 'Pukë' },
  { value: 'Bulqize', label: 'Bulqizë' },
  { value: 'Gramsh', label: 'Gramsh' },
  { value: 'Librazhd', label: 'Librazhd' },
  { value: 'Tropoje', label: 'Tropojë' },
  { value: 'Has', label: 'Has' },
  { value: 'Malesi e Madhe', label: 'Malësi e Madhe' },
  { value: 'Mirdite', label: 'Mirditë' },
  { value: 'Mat', label: 'Mat' },
  { value: 'Diber', label: 'Dibër' },
  { value: 'Cerrik', label: 'Cërrik' },
  { value: 'Peqin', label: 'Peqin' },
  { value: 'Rrogozhine', label: 'Rrogozhinë' },
  { value: 'Divjake', label: 'Divjakë' },
  { value: 'Mallakaster', label: 'Mallakastër' },
  { value: 'Patos', label: 'Patos' },
  { value: 'Roskovec', label: 'Roskovec' },
  { value: 'Kucove', label: 'Kuçovë' },
  { value: 'Skrapar', label: 'Skrapar' },
  { value: 'Polican', label: 'Poliçan' },
  { value: 'Devoll', label: 'Devoll' },
  { value: 'Kolonje', label: 'Kolonjë' },
  { value: 'Pustec', label: 'Pustec' },
  { value: 'Himara', label: 'Himarë' },
  { value: 'Delvine', label: 'Delvinë' },
  { value: 'Konispol', label: 'Konispol' },
  { value: 'Finiq', label: 'Finiq' },
  { value: 'Selenice', label: 'Selenicë' },
  { value: 'Memaliaj', label: 'Memaliaj' },
  { value: 'Kelcyre', label: 'Këlcyrë' },
  { value: 'Libohove', label: 'Libohovë' },
  { value: 'Dropull', label: 'Dropull' },
];

export const searchCities = (query: string): City[] => {
  if (!query) return cities;
  const lowerQuery = query.toLowerCase();
  return cities.filter(city => 
    city.label.toLowerCase().includes(lowerQuery) ||
    city.value.toLowerCase().includes(lowerQuery)
  );
};
