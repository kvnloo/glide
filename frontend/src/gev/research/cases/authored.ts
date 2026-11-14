// Authored deep-research examples in the situations that win on @bilawalsidhu's channel (event
// reconstructions, "spy tool you can use", time machine, storms). They are written scenarios, badged
// AUTHORED EXAMPLE on the card: sources are described by kind, never attributed to a real outlet or
// account, and no figure here is a claim about a real event. Each `inspiredBy` is his public video.

import { type Platform, PLATFORMS, type Pull, type ResearchCase, type Tally } from '../case.js'

/** Cumulative per-platform totals along an S-curve: fast early pull, then a long tail. */
function grow(span: number, finals: Readonly<Partial<Record<Platform, number>>>, half: number): Tally[] {
  return Array.from({ length: 40 }, (_, i) => {
    const t = (span * (i + 1)) / 40
    const f = (1 - Math.exp(-t / half)) / (1 - Math.exp(-span / half))
    const by: Partial<Record<Platform, number>> = {}
    for (const p of PLATFORMS) {
      const n = finals[p]
      if (n !== undefined) by[p] = Math.round(n * f)
    }
    return { t, by }
  })
}
const pull = (t: number, platform: Platform, label: string, detail?: string, media?: Pull['media']): Pull =>
  ({ t, platform, label, ...(detail ? { detail } : {}), ...(media ? { media } : {}) })

const GROUND_STOP: ResearchCase = {
  id: 'ground-stop', title: 'Ground stop: the sky empties', basis: 'authored',
  ask: 'The FAA just called a national ground stop. Show me the sky emptying and pull everything on why.',
  place: 'Continental US', eventUtc: '2026-11-13T14:05:00Z',
  inspiredBy: { title: 'FAA Nationwide Ground Stop - 3D Replay in God’s Eye View', url: 'https://www.youtube.com/watch?v=Nu-tf_seATI' },
  view: '#v=2&lat=38.5&lon=-96&alt=4200000&heading=0&pitch=-90&roll=0', span: 360,
  tallies: grow(360, { data: 14, official: 9, x: 640, reddit: 210, news: 96, youtube: 38, tiktok: 55 }, 70),
  pulls: [
    pull(1, 'data', 'Live ADS-B: 4,812 airborne over CONUS', 'aircraft feed', 'data'),
    pull(3, 'official', 'FAA status page: ground stop, all departures', 'air traffic status', 'text'),
    pull(6, 'x', 'Pilot thread: "holding short at ORD, told 90 min minimum"', 'post', 'text'),
    pull(11, 'x', 'Timelapse of departure boards turning red at ATL', 'post', 'video'),
    pull(18, 'reddit', 'r/aviation megathread: what we know', 'thread', 'text'),
    pull(24, 'tiktok', 'Passenger video: full gate area at DEN', 'video', 'video'),
    pull(40, 'news', 'Airlines confirm a systems outage, not weather', 'wire story', 'text'),
    pull(75, 'data', 'Airborne count 1,203 and falling; arrivals only', 'aircraft feed', 'data'),
    pull(130, 'official', 'FAA: ground stop lifted, staged departures', 'air traffic status', 'text'),
    pull(220, 'data', 'Departures recover to 80% of a normal Thursday', 'aircraft feed', 'data')
  ],
  findings: [
    { t: 2, text: 'Departures stop within 4 minutes across every hub; arrivals keep landing', tier: 'seen' },
    { t: 40, text: 'Cause reported as an airline systems outage, not weather or security', tier: 'reported' },
    { t: 75, text: 'Airborne traffic falls 75% in 70 minutes as aircraft land and none replace them', tier: 'seen' },
    { t: 140, text: 'Recovery is staggered: east-coast hubs restart ~25 min before the west', tier: 'derived' },
    { t: 230, text: 'Roughly 1,900 flights delayed past 2 h, from schedule vs observed departures', tier: 'derived' }
  ],
  sim: [
    { id: 'live', label: 'Live traffic layer, CONUS', start: 0, t: 2, layer: 'aircraft' },
    { id: 'base', label: 'Same hour last Thursday as the baseline', start: 2, t: 20, layer: 'aircraft' },
    { id: 'empty', label: 'Time-lapse: the sky emptying', start: 20, t: 90, layer: 'replay' },
    { id: 'restart', label: 'Hub-by-hub restart wave', start: 130, t: 240, layer: 'replay' }
  ]
}

const CYCLONE: ResearchCase = {
  id: 'cyclone-landfall', title: 'Hurricane landfall, live', basis: 'authored',
  ask: 'Track the hurricane into landfall. Pull radar, satellite, buoys and what people are filming.',
  place: 'Gulf Coast, US', eventUtc: '2026-09-28T03:00:00Z',
  inspiredBy: { title: 'Tracking Storms in God’s Eye View Is Insanely Cool', url: 'https://www.youtube.com/watch?v=GUo5VKPwwh8' },
  view: '#v=2&lat=28.9&lon=-89.4&alt=1600000&heading=0&pitch=-70&roll=0', span: 2880,
  tallies: grow(2880, { imagery: 180, data: 420, official: 64, x: 2400, reddit: 380, youtube: 160, tiktok: 520, news: 410 }, 600),
  pulls: [
    pull(2, 'official', 'Hurricane center advisory: Category 4, 140 mph', 'advisory', 'text'),
    pull(5, 'imagery', 'GOES-East 1-minute mesoscale, eye clearing', 'satellite', 'photo'),
    pull(12, 'data', 'Buoy 42040: 38 ft waves, pressure falling', 'buoy', 'data'),
    pull(30, 'data', 'NEXRAD volume: eyewall 40 km offshore', 'radar', 'data'),
    pull(95, 'tiktok', 'Storm surge over a seawall, filmed from a balcony', 'video', 'video'),
    pull(180, 'x', 'Storm chaser live: eyewall winds in a parking garage', 'livestream', 'video'),
    pull(420, 'reddit', 'Power outage map thread: 610k without power', 'thread', 'text'),
    pull(900, 'imagery', 'First clear-sky Sentinel-2 pass over the coast', 'satellite', 'photo'),
    pull(1700, 'news', 'Officials survey surge damage by helicopter', 'wire story', 'video'),
    pull(2600, 'imagery', 'Before/after tiles of the barrier island', 'satellite', 'photo')
  ],
  findings: [
    { t: 5, text: 'Eye clears on 1-minute imagery as the storm crosses warm water', tier: 'seen' },
    { t: 35, text: 'Eyewall reaches the coast 50 minutes earlier than the 00Z forecast track', tier: 'derived' },
    { t: 100, text: 'Surge videos cluster 30 km east of the eye, matching the right-front quadrant', tier: 'derived' },
    { t: 430, text: 'Outages peak at about 610,000 customers', tier: 'reported' },
    { t: 2650, text: 'Imagery shows new breaches cutting the barrier island in two places', tier: 'seen' }
  ],
  sim: [
    { id: 'track', label: 'Forecast cone vs observed track', start: 0, t: 10, layer: 'storm' },
    { id: 'radar', label: '3D radar volume of the eyewall', start: 10, t: 40, layer: 'radar' },
    { id: 'wind', label: 'Surface wind field', start: 30, t: 120, layer: 'wind' },
    { id: 'videos', label: 'Geolocate surge videos onto the coast', start: 90, t: 600, layer: 'cameras' },
    { id: 'change', label: 'Before/after imagery of the coast', start: 900, t: 2700, layer: 'imagery' }
  ]
}

const QUAKE: ResearchCase = {
  id: 'quake-shaking', title: 'Earthquake: who felt it', basis: 'authored',
  ask: 'A big quake just hit. Where was it, who felt it, and what does the shaking look like?',
  place: 'Pacific coast', eventUtc: '2026-10-09T09:41:00Z',
  inspiredBy: { title: 'God’s Eye View Is Becoming a 4D Time Machine', url: 'https://www.youtube.com/watch?v=lX7wTtCsfIg' },
  view: '#v=2&lat=40.3&lon=-124.4&alt=900000&heading=0&pitch=-60&roll=0', span: 720,
  tallies: grow(720, { data: 85, official: 22, x: 1300, reddit: 240, tiktok: 300, youtube: 60, news: 140 }, 90),
  pulls: [
    pull(1, 'data', 'Seismic feed: M6.9, depth 18 km, offshore', 'quake feed', 'data'),
    pull(3, 'official', 'Tsunami center: no tsunami threat for the coast', 'bulletin', 'text'),
    pull(4, 'x', '"Did anyone else feel that?" posts spike 600 km inland', 'posts', 'text'),
    pull(9, 'tiktok', 'Doorbell camera: a living room shakes for 20 s', 'video', 'video'),
    pull(15, 'data', '"Did you feel it?" reports: 21,000 in 15 minutes', 'felt reports', 'data'),
    pull(40, 'data', 'Aftershocks: 14 above M3', 'quake feed', 'data'),
    pull(90, 'news', 'Highway closed for a slide; no major damage', 'local news', 'text'),
    pull(300, 'reddit', 'Thread mapping where people woke up', 'thread', 'text')
  ],
  findings: [
    { t: 1, text: 'M6.9 at 18 km, about 70 km offshore', tier: 'seen' },
    { t: 4, text: 'Social posts arrive inland before the shaking reports finish: the wave front is visible in timestamps', tier: 'derived' },
    { t: 16, text: 'Felt reports reach 600 km; strongest shaking on the coast nearest the epicentre', tier: 'seen' },
    { t: 45, text: 'Aftershocks line up along the fault, about 40 km long', tier: 'derived' },
    { t: 95, text: 'One highway slide; no major structural damage reported', tier: 'reported' }
  ],
  sim: [
    { id: 'quake', label: 'Epicentre and depth', start: 0, t: 1, layer: 'quakes' },
    { id: 'wave', label: 'Shaking wave front over time', start: 1, t: 10, layer: 'shaking' },
    { id: 'felt', label: 'Felt reports as a heat map', start: 10, t: 30, layer: 'felt' },
    { id: 'after', label: 'Aftershock sequence', start: 30, t: 720, layer: 'quakes' }
  ]
}

const DARK_FLEET: ResearchCase = {
  id: 'dark-fleet', title: 'Tankers that went dark', basis: 'authored',
  ask: 'Which tankers turned their transponders off near the strait this week, and where did they reappear?',
  place: 'Strait of Hormuz', eventUtc: '2026-11-06T00:00:00Z',
  inspiredBy: { title: 'Watch This Tanker Go Dark in the Strait of Hormuz (God’s Eye View)', url: 'https://www.youtube.com/watch?v=NOHCTdoDk_E' },
  view: '#v=2&lat=26.4&lon=56.4&alt=700000&heading=0&pitch=-75&roll=0', span: 10080,
  tallies: grow(10080, { data: 2600, imagery: 48, official: 6, x: 190, reddit: 40, news: 35 }, 2500),
  pulls: [
    pull(5, 'data', 'AIS: 1,140 vessels in the area this week', 'ship positions', 'data'),
    pull(60, 'data', 'Gaps over 6 h: 23 tankers', 'ship positions', 'data'),
    pull(240, 'imagery', 'Sentinel-1 radar pass: 31 ship returns, 6 without AIS', 'satellite', 'photo'),
    pull(800, 'x', 'Analyst thread on a ship-to-ship transfer at anchor', 'post', 'photo'),
    pull(1900, 'imagery', 'Sentinel-2 optical: two hulls side by side', 'satellite', 'photo'),
    pull(4300, 'news', 'Sanctions list adds four tankers', 'wire story', 'text'),
    pull(7600, 'data', 'Three of the six reappear 400 km south', 'ship positions', 'data')
  ],
  findings: [
    { t: 60, text: '23 tankers have AIS gaps longer than 6 hours this week', tier: 'seen' },
    { t: 245, text: 'Radar imagery shows 6 hulls with no matching AIS signal', tier: 'seen' },
    { t: 1950, text: 'Two hulls side by side for ~9 h: consistent with a ship-to-ship transfer', tier: 'inferred' },
    { t: 7650, text: 'Three of the dark six reappear 400 km south under the same identities', tier: 'seen' }
  ],
  sim: [
    { id: 'ais', label: 'A week of ship tracks', start: 0, t: 20, layer: 'vessels' },
    { id: 'gaps', label: 'Mark transponder gaps', start: 20, t: 80, layer: 'vessels' },
    { id: 'sar', label: 'Match radar returns to tracks', start: 200, t: 400, layer: 'imagery' },
    { id: 'sts', label: 'Flag side-by-side hulls', start: 1800, t: 2100, layer: 'imagery' },
    { id: 'reappear', label: 'Link gaps to reappearances', start: 7000, t: 8000, layer: 'vessels' }
  ]
}

const WILDFIRE: ResearchCase = {
  id: 'wildfire-spread', title: 'Wildfire spread, hour by hour', basis: 'authored',
  ask: 'Show me how the fire spread overnight. Pull satellite hotspots, cameras and evacuation orders.',
  place: 'Southern California', eventUtc: '2026-10-21T05:00:00Z',
  inspiredBy: { title: 'Ukraine War God’s Eye View - 4.5 Years of Satellite Fire Detections', url: 'https://www.youtube.com/watch?v=h-s2TjWqEpA' },
  view: '#v=2&lat=34.2&lon=-118.5&alt=120000&heading=20&pitch=-40&roll=0', span: 1440,
  tallies: grow(1440, { imagery: 140, data: 260, official: 75, x: 1700, reddit: 310, tiktok: 480, youtube: 90, news: 220 }, 300),
  pulls: [
    pull(2, 'imagery', 'Satellite hotspots: first detection at 21:40 local', 'fire detections', 'data'),
    pull(10, 'data', 'Wind station: gusts to 60 mph from the north-east', 'weather station', 'data'),
    pull(20, 'data', 'Ridge-top camera: flame front visible', 'fire camera', 'video'),
    pull(45, 'official', 'Evacuation order for three zones', 'county alert', 'text'),
    pull(70, 'tiktok', 'Driving out on the highway, embers crossing', 'video', 'video'),
    pull(260, 'imagery', 'Polar orbiter pass: perimeter 4,800 acres', 'fire detections', 'data'),
    pull(900, 'imagery', 'Morning optical pass through smoke', 'satellite', 'photo')
  ],
  findings: [
    { t: 12, text: 'Wind is pushing the head of the fire south-west at about 2 km/h', tier: 'derived' },
    { t: 46, text: 'Evacuation orders cover three zones, about 9,000 residents', tier: 'reported' },
    { t: 265, text: 'Perimeter about 4,800 acres; spotting reached 1.5 km ahead of the front', tier: 'seen' },
    { t: 910, text: 'Burn scar on morning imagery matches the overnight hotspot path', tier: 'seen' }
  ],
  sim: [
    { id: 'hot', label: 'Hotspot detections over time', start: 0, t: 10, layer: 'fires' },
    { id: 'wind', label: 'Wind field from stations', start: 5, t: 30, layer: 'wind' },
    { id: 'spread', label: 'Spread replay, hour by hour', start: 30, t: 300, layer: 'replay' },
    { id: 'cams', label: 'Place fire cameras and videos', start: 20, t: 400, layer: 'cameras' },
    { id: 'scar', label: 'Burn scar from imagery', start: 880, t: 960, layer: 'imagery' }
  ]
}

const VOLCANO_ASH: ResearchCase = {
  id: 'volcano-ash', title: 'Ash cloud vs the flights', basis: 'authored',
  ask: 'The volcano erupted. Where is the ash going, and which flights are rerouting around it?',
  place: 'North Pacific', eventUtc: '2026-08-14T20:10:00Z',
  inspiredBy: { title: 'Watching Air Traffic Dodging Volcanic Ash Plumes from Orbit in God’s Eye View', url: 'https://www.youtube.com/watch?v=VA7qGKDDtrs' },
  view: '#v=2&lat=56.1&lon=160.6&alt=2500000&heading=0&pitch=-70&roll=0', span: 2160,
  tallies: grow(2160, { imagery: 210, data: 380, official: 40, x: 520, reddit: 70, youtube: 25, news: 85 }, 500),
  pulls: [
    pull(3, 'official', 'Volcanic ash advisory: plume to 45,000 ft', 'ash advisory', 'text'),
    pull(8, 'imagery', 'Himawari 10-minute imagery: umbrella cloud', 'satellite', 'photo'),
    pull(30, 'data', 'Flights on the North Pacific tracks: 64 airborne', 'aircraft feed', 'data'),
    pull(70, 'x', 'Passenger photo of the plume from a window', 'post', 'photo'),
    pull(180, 'data', '17 flights rerouted south of the plume', 'aircraft feed', 'data'),
    pull(600, 'official', 'Updated ash forecast: plume drifting east', 'ash advisory', 'text')
  ],
  findings: [
    { t: 9, text: 'Umbrella cloud spreading at the tropopause, about 45,000 ft', tier: 'seen' },
    { t: 185, text: '17 transpacific flights moved south of the forecast ash area', tier: 'seen' },
    { t: 190, text: 'Average reroute adds about 25 minutes', tier: 'derived' },
    { t: 610, text: 'Forecast keeps the ash north of the main tracks for 24 h', tier: 'reported' }
  ],
  sim: [
    { id: 'plume', label: 'Ash plume from satellite', start: 0, t: 15, layer: 'imagery' },
    { id: 'forecast', label: 'Ash forecast polygons over time', start: 3, t: 620, layer: 'ash' },
    { id: 'flights', label: 'Flight tracks vs the ash', start: 25, t: 200, layer: 'aircraft' }
  ]
}

export const AUTHORED: readonly ResearchCase[] = [GROUND_STOP, CYCLONE, QUAKE, DARK_FLEET, WILDFIRE, VOLCANO_ASH]
