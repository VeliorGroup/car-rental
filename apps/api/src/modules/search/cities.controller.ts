import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Albanian cities data
const ALBANIAN_CITIES = [
  { name: 'Tiranë', region: 'Tiranë', population: 418495 },
  { name: 'Durrës', region: 'Durrës', population: 175110 },
  { name: 'Vlorë', region: 'Vlorë', population: 104827 },
  { name: 'Shkodër', region: 'Shkodër', population: 88245 },
  { name: 'Elbasan', region: 'Elbasan', population: 100903 },
  { name: 'Fier', region: 'Fier', population: 56297 },
  { name: 'Korçë', region: 'Korçë', population: 75994 },
  { name: 'Berat', region: 'Berat', population: 36496 },
  { name: 'Lushnjë', region: 'Fier', population: 41469 },
  { name: 'Pogradec', region: 'Korçë', population: 20848 },
  { name: 'Kavajë', region: 'Tiranë', population: 20192 },
  { name: 'Gjirokastër', region: 'Gjirokastër', population: 23437 },
  { name: 'Sarandë', region: 'Vlorë', population: 17233 },
  { name: 'Laç', region: 'Lezhë', population: 17086 },
  { name: 'Kukës', region: 'Kukës', population: 16719 },
  { name: 'Lezhë', region: 'Lezhë', population: 15510 },
  { name: 'Peshkopi', region: 'Dibër', population: 13251 },
  { name: 'Kuçovë', region: 'Berat', population: 12654 },
  { name: 'Burrel', region: 'Dibër', population: 10865 },
  { name: 'Pukë', region: 'Shkodër', population: 6495 },
  { name: 'Krujë', region: 'Durrës', population: 21286 },
  { name: 'Kamëz', region: 'Tiranë', population: 126777 },
  { name: 'Vorë', region: 'Tiranë', population: 25000 },
  { name: 'Fushë-Krujë', region: 'Durrës', population: 10586 },
  { name: 'Shijak', region: 'Durrës', population: 8174 },
  { name: 'Përmet', region: 'Gjirokastër', population: 5927 },
  { name: 'Tepelenë', region: 'Gjirokastër', population: 4235 },
  { name: 'Gramsh', region: 'Elbasan', population: 11556 },
  { name: 'Librazhd', region: 'Elbasan', population: 9427 },
  { name: 'Bulqizë', region: 'Dibër', population: 11212 },
  { name: 'Rrogozhinë', region: 'Elbasan', population: 6342 },
  { name: 'Peqin', region: 'Elbasan', population: 6815 },
  { name: 'Cërrik', region: 'Elbasan', population: 8321 },
  { name: 'Roskovec', region: 'Fier', population: 7567 },
  { name: 'Ballsh', region: 'Fier', population: 6543 },
  { name: 'Divjakë', region: 'Fier', population: 4890 },
  { name: 'Patos', region: 'Fier', population: 27532 },
  { name: 'Bilisht', region: 'Korçë', population: 7824 },
  { name: 'Ersekë', region: 'Korçë', population: 4321 },
  { name: 'Leskovik', region: 'Korçë', population: 1765 },
  { name: 'Maliq', region: 'Korçë', population: 8543 },
  { name: 'Memaliaj', region: 'Gjirokastër', population: 5432 },
  { name: 'Koplik', region: 'Shkodër', population: 4321 },
  { name: 'Vau i Dejës', region: 'Shkodër', population: 3456 },
  { name: 'Mamurras', region: 'Lezhë', population: 7654 },
  { name: 'Rrëshen', region: 'Lezhë', population: 8765 },
  { name: 'Rubik', region: 'Lezhë', population: 5432 },
  { name: 'Orikum', region: 'Vlorë', population: 3456 },
  { name: 'Himarë', region: 'Vlorë', population: 3054 },
  { name: 'Konispol', region: 'Vlorë', population: 2134 },
  { name: 'Delvinë', region: 'Vlorë', population: 5876 },
];

// Kosovo cities
const KOSOVO_CITIES = [
  { name: 'Prishtinë', region: 'Prishtinë', population: 198897 },
  { name: 'Prizren', region: 'Prizren', population: 177781 },
  { name: 'Ferizaj', region: 'Ferizaj', population: 108610 },
  { name: 'Pejë', region: 'Pejë', population: 96450 },
  { name: 'Gjakovë', region: 'Gjakovë', population: 94556 },
  { name: 'Gjilan', region: 'Gjilan', population: 90015 },
  { name: 'Mitrovicë', region: 'Mitrovicë', population: 71909 },
  { name: 'Podujevë', region: 'Prishtinë', population: 88499 },
  { name: 'Vushtrri', region: 'Mitrovicë', population: 69870 },
  { name: 'Suharekë', region: 'Prizren', population: 59722 },
  { name: 'Rahovec', region: 'Gjakovë', population: 56208 },
  { name: 'Drenas', region: 'Prishtinë', population: 58531 },
  { name: 'Lipjan', region: 'Prishtinë', population: 57605 },
  { name: 'Malishevë', region: 'Gjakovë', population: 54613 },
  { name: 'Klinë', region: 'Pejë', population: 38496 },
  { name: 'Skënderaj', region: 'Mitrovicë', population: 50858 },
  { name: 'Kaçanik', region: 'Ferizaj', population: 33409 },
  { name: 'Istog', region: 'Pejë', population: 39289 },
  { name: 'Deçan', region: 'Gjakovë', population: 40019 },
  { name: 'Fushë Kosovë', region: 'Prishtinë', population: 34827 },
];

// Major European cities
const EUROPEAN_CITIES = [
  { name: 'Rome', region: 'Lazio', country: 'IT' },
  { name: 'Milan', region: 'Lombardy', country: 'IT' },
  { name: 'Munich', region: 'Bavaria', country: 'DE' },
  { name: 'Vienna', region: 'Vienna', country: 'AT' },
  { name: 'Zurich', region: 'Zürich', country: 'CH' },
  { name: 'Ljubljana', region: 'Central Slovenia', country: 'SI' },
  { name: 'Zagreb', region: 'Zagreb', country: 'HR' },
  { name: 'Belgrade', region: 'Belgrade', country: 'RS' },
  { name: 'Skopje', region: 'Skopje', country: 'MK' },
  { name: 'Podgorica', region: 'Podgorica', country: 'ME' },
  { name: 'Sarajevo', region: 'Sarajevo', country: 'BA' },
  { name: 'Sofia', region: 'Sofia', country: 'BG' },
  { name: 'Thessaloniki', region: 'Central Macedonia', country: 'GR' },
  { name: 'Athens', region: 'Attica', country: 'GR' },
];

@ApiTags('cities')
@Controller('cities')
export class CitiesController {
  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete cities by search term' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'country', required: false, description: 'Filter by country (AL, XK, or all)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results' })
  async autocomplete(
    @Query('q') query: string,
    @Query('country') country?: string,
    @Query('limit') limit?: string,
  ) {
    const maxResults = parseInt(limit || '10');
    const searchTerm = query?.toLowerCase().trim() || '';

    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    let cities: any[] = [];

    // Add Albanian cities
    if (!country || country === 'AL' || country === 'all') {
      cities.push(
        ...ALBANIAN_CITIES.map(c => ({ ...c, country: 'AL' }))
      );
    }

    // Add Kosovo cities
    if (!country || country === 'XK' || country === 'all') {
      cities.push(
        ...KOSOVO_CITIES.map(c => ({ ...c, country: 'XK' }))
      );
    }

    // Add European cities if searching all
    if (country === 'all' || country === 'EU') {
      cities.push(...EUROPEAN_CITIES);
    }

    // Filter and sort by relevance
    const filtered = cities
      .filter(city => 
        city.name.toLowerCase().includes(searchTerm) ||
        city.region?.toLowerCase().includes(searchTerm)
      )
      .sort((a, b) => {
        // Exact match first
        const aExact = a.name.toLowerCase() === searchTerm;
        const bExact = b.name.toLowerCase() === searchTerm;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Starts with query second
        const aStarts = a.name.toLowerCase().startsWith(searchTerm);
        const bStarts = b.name.toLowerCase().startsWith(searchTerm);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // By population (descending)
        return (b.population || 0) - (a.population || 0);
      })
      .slice(0, maxResults);

    return filtered.map(city => ({
      name: city.name,
      region: city.region,
      country: city.country,
      displayName: `${city.name}, ${city.region}${city.country !== 'AL' ? ` (${city.country})` : ''}`,
    }));
  }

  @Get('regions')
  @ApiOperation({ summary: 'Get all regions/counties' })
  @ApiQuery({ name: 'country', required: false, description: 'Filter by country' })
  async getRegions(@Query('country') country?: string) {
    const regions = new Set<string>();

    if (!country || country === 'AL') {
      ALBANIAN_CITIES.forEach(c => regions.add(c.region));
    }
    if (!country || country === 'XK') {
      KOSOVO_CITIES.forEach(c => regions.add(c.region));
    }

    return Array.from(regions).sort();
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular cities' })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getPopular(
    @Query('country') country?: string,
    @Query('limit') limit?: string,
  ) {
    const maxResults = parseInt(limit || '10');
    let cities: any[] = [];

    if (!country || country === 'AL') {
      cities.push(
        ...ALBANIAN_CITIES.map(c => ({ ...c, country: 'AL' }))
      );
    }
    if (!country || country === 'XK') {
      cities.push(
        ...KOSOVO_CITIES.map(c => ({ ...c, country: 'XK' }))
      );
    }

    return cities
      .sort((a, b) => (b.population || 0) - (a.population || 0))
      .slice(0, maxResults)
      .map(city => ({
        name: city.name,
        region: city.region,
        country: city.country,
        population: city.population,
      }));
  }
}
