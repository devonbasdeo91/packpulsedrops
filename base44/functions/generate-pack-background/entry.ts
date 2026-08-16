import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Category-themed background prompts shown behind the pack-opening reveal.
const CATEGORY_BG_PROMPT = {
  yugioh: 'Ancient Egyptian scene, towering pyramids and hieroglyphic tablets glowing with mystical gold light, pharaoh silhouette, desert dusk, dramatic anime atmosphere, cinematic wide composition, no text',
  pokemon: 'Vibrant anime scene of fantastical creatures performing elemental special moves, electric and fire energy bursts, lush battlefield, dynamic anime composition, no text',
  dragonball: 'Dragon Ball Z anime scene, saiyan warrior blazing with golden energy aura, cracked battlefield under stormy sky, explosive ki light, dramatic anime composition, no text',
  digimon: 'Holographic digital world, glowing wireframe grid, holographic cyber monsters materializing from light, neon cyan and teal, futuristic atmosphere, no text',
  baseball: 'Baseball stadium at night under floodlights, batter mid-swing hitting a home run, crowd and dramatic stadium lights, dynamic sports composition, no text',
  basketball: 'Basketball arena, legendary player soaring for an iconic slam dunk, dramatic spotlight, crowd silhouettes, dynamic sports composition, no text',
  football: 'American football stadium, legendary quarterback releasing a touchdown pass, dramatic stadium lights, dynamic sports composition, no text',
  soccer: 'Soccer stadium, star player striking a goal shot, net rippling, dramatic floodlights and crowd, dynamic sports composition, no text',
  cricket: 'Cricket stadium, batsman playing a cover drive, ball in flight, floodlights and roaring crowd, dynamic sports composition, no text',
  tennis: 'Tennis grand slam court, player mid-serve, ball streaking across, dramatic stadium lights and crowd, dynamic sports composition, no text',
  wnba: 'WNBA basketball arena, female star player soaring for a layup, dramatic spotlight, crowd silhouettes, dynamic sports composition, no text',
  nhl: 'Ice hockey arena, player unleashing a slap shot, puck flying, dramatic rink lights and crowd, dynamic sports composition, no text',
  golf: 'Golf course at a major championship, golfer mid-swing, ball streaking down the fairway, gallery crowd and lush greens, dynamic sports composition, no text',
  badminton: 'Badminton arena, player mid-smash, shuttlecock frozen mid-flight, dramatic lights and crowd, dynamic sports composition, no text',
  tabletennis: 'Table tennis arena, player mid-loop forehand, ball blurred in motion, dramatic spotlight, dynamic sports composition, no text',
  swimming: 'Olympic swimming pool, swimmer mid-freestyle stroke, water spray and lane lines, dramatic arena lights, dynamic sports composition, no text',
  trackfield: 'Olympic track stadium, sprinter exploding out of the blocks, dramatic floodlights and crowd, dynamic sports composition, no text',
  f1: 'Formula 1 grand prix circuit at sunset, sleek open-wheel race car speeding through a corner, tire smoke and dramatic floodlights, dynamic motorsport composition, no text',
  naruto: 'Naruto anime ninja scene, shinobi unleashing swirling jutsu energy, hidden village rooftops at dusk, dynamic anime composition, no text',
  bleach: 'Bleach anime scene, soul reaper with glowing spiritual energy blade, ethereal spirit world, dramatic anime composition, no text',
};

const VALID = new Set(Object.keys(CATEGORY_BG_PROMPT));

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const category = body.category;
    if (!category || !VALID.has(category)) {
      return Response.json({ error: 'Invalid category' }, { status: 400 });
    }
    const prompt = `${CATEGORY_BG_PROMPT[category]}, atmospheric background art, deep dark tones, subtle, wide landscape, high detail, no text, no watermark`;
    const result = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
    if (!result?.url) return Response.json({ error: 'Generation failed' }, { status: 500 });
    return Response.json({ url: result.url });
  } catch (error) {
    console.error('generate-pack-background error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}