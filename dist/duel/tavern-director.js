import { AUTHORED_CHARACTERS } from './characters.js';
import { BANTER_RECORDINGS, banterReaction } from './banter.js';

// ─────────────────────────────────────────────────────────────────────────────
// Voiced Tavern guests. Now and then Bramm, Edrin, Ragna, Kesh, Veyra or Gorvan
// happens to be playing at a Tavern table. Each guest is data — the owner-approved
// list of recordings that make sense at a four-seat table, how readily they talk,
// and the faces they pull — and ONE table-wide director decides whether anybody
// speaks at all. Most eligible moments stay silent. Lines never overlap, never
// repeat within a match, and two or three guests do not multiply the chatter.
// Only existing recordings are used; nothing is generated.
// ─────────────────────────────────────────────────────────────────────────────

const L=(prefix,...ids)=>ids.map(id=>`${prefix}_${id}`);

// Tavern-safe allowlists (owner-approved, v101; Veyra and Gorvan v104). Trigger names
// are seen from the speaker's seat: `own_*` happened to them, `other_*` to someone else.
export const TAVERN_GUEST_POOLS=Object.freeze({
  kesh:Object.freeze({
    intro:L('kesh','intro_01','intro_02','intro_03'),
    idle:L('kesh','idle_01','idle_02','idle_03'),slow:L('kesh','idle_04'),
    other_good_move:L('kesh','player_good_move_01','player_good_move_02','player_good_move_03'),
    own_good_move:L('kesh','good_move_01','good_move_02','good_move_03'),
    setback:L('kesh','annoyed_01','annoyed_02','annoyed_03'),
    // "The signs were wrong" — only after he really consulted the stone (the tell).
    surprised:L('kesh','surprised_01','surprised_02','surprised_03'),
    other_draw:L('kesh','player_draw_01','player_draw_02'),own_draw:L('kesh','draw_01','draw_02','draw_03'),
    skip:L('kesh','skip_01','skip_02'),curse:L('kesh','curse_01','curse_02'),reverse:L('kesh','reverse_01','reverse_02'),king:L('kesh','king_01','king_02'),
    other_one_card:L('kesh','player_one_card_01','player_one_card_02','player_one_card_03'),own_one_card:L('kesh','one_card_01','one_card_02'),
    round_win:L('kesh','round_win_01','round_win_02','round_win_03'),round_loss:L('kesh','round_loss_01','round_loss_02','round_loss_03'),
    match_win:L('kesh','match_win_01','match_win_02','match_win_03'),match_loss:L('kesh','match_loss_01','match_loss_02','match_loss_03'),
    // Only while the rune-stone tell is actually happening at this table.
    omen:L('kesh','omen_01','omen_02','omen_03')
  }),
  edrin:Object.freeze({
    intro:L('edrin','intro_01','intro_02','intro_03'),idle:L('edrin','idle_01','idle_02','idle_03'),
    other_good_move:L('edrin','player_good_move_01','player_good_move_02','player_good_move_03'),own_good_move:L('edrin','good_move_01','good_move_02','good_move_03'),
    other_draw:L('edrin','player_draw_01'),own_draw:L('edrin','draw_01','draw_02'),
    other_one_card:L('edrin','player_one_card_01','player_one_card_02'),own_one_card:L('edrin','one_card_01','one_card_02'),
    round_win:L('edrin','round_win_01','round_win_02','round_win_03'),round_loss:L('edrin','round_loss_01','round_loss_03'),
    match_win:L('edrin','match_win_02','match_win_03'),match_loss:L('edrin','match_loss_01','match_loss_02','match_loss_03'),
    brutal:L('edrin','brutal_move_01','brutal_move_02')
  }),
  ragna:Object.freeze({
    intro:L('ragna','intro_03'),idle:L('ragna','idle_03'),slow:L('ragna','idle_01','idle_02'),
    // Her tavern shouting: rare so it stays funny (at most one per match).
    shout:L('ragna','idle_04','noise_01'),
    other_good_move:L('ragna','player_good_move_01','player_good_move_02','player_good_move_03'),own_good_move:L('ragna','good_move_01','good_move_02','good_move_03'),
    other_draw:L('ragna','player_draw_02'),own_draw:L('ragna','draw_01','draw_03'),
    // "Stupid." and "Wrong card. My fault." only after her own knowing slip cost her a draw — as in a Duel.
    self_mistake:L('ragna','self_mistake_01','draw_02'),
    other_one_card:L('ragna','player_one_card_01','player_one_card_02','player_one_card_03','player_one_card_04'),own_one_card:L('ragna','one_card_01','one_card_02','one_card_03'),
    round_win:L('ragna','round_win_01','round_win_02','round_win_04'),round_loss:L('ragna','round_loss_01','round_loss_02','round_loss_03'),
    match_win:L('ragna','match_win_01','match_win_03'),match_loss:L('ragna','match_loss_01','match_loss_03')
  }),
  bramm:Object.freeze({
    intro:L('bramm','intro_01','intro_02'),idle:L('bramm','idle_01','idle_02'),
    // He addresses whoever's turn or move it is.
    taunt:L('bramm','taunt_01'),slow:L('bramm','taunt_02'),mock:L('bramm','mock_move_01','mock_move_02'),
    other_good_move:L('bramm','player_good_move_01','player_good_move_02'),other_draw:L('bramm','player_draw_01'),
    own_good_move:L('bramm','bramm_good_move_01','bramm_good_move_02'),own_draw:L('bramm','bramm_draw_02'),setback:L('bramm','excuse_01','excuse_02'),
    other_one_card:L('bramm','player_one_card_01','player_one_card_03','player_one_card_05','player_one_card_06','player_one_card_07'),
    round_win:L('bramm','round_win_01','round_win_02','round_win_03','round_win_04'),round_loss:L('bramm','loss_01'),
    match_win:L('bramm','win_01','win_02','win_04','win_06','win_07','win_09','win_10'),match_loss:L('bramm','match_loss_01','match_loss_02','match_loss_03')
  }),
  // Veyra: her whole authored set except the English-only lines in Hebrew (left out
  // by the voice check, never replaced). Omen lines play only for an omen the table
  // really heard her declare, and only the line for that omen.
  veyra:Object.freeze({
    intro:L('veyra','intro_01','intro_02','intro_03','intro_04'),idle:L('veyra','idle_01','idle_02','idle_03','idle_04'),
    other_good_move:L('veyra','player_good_move_01','player_good_move_02','player_good_move_03'),own_good_move:L('veyra','good_move_01','good_move_02','good_move_03'),
    other_draw:L('veyra','player_draw_01','player_draw_02'),own_draw:L('veyra','draw_02','draw_03'),
    curse_taken:L('veyra','curse_01','draw_01'),curse_landed:L('veyra','curse_02'),stop_given:L('veyra','stop_01'),stop_taken:L('veyra','stop_02'),king:L('veyra','king_02'),
    other_one_card:L('veyra','player_one_card_01','player_one_card_02','player_one_card_03','player_one_card_04'),own_one_card:L('veyra','one_card_01','one_card_02','one_card_03'),
    omen_declare:L('veyra','omen_01','omen_02','omen_03','omen_04'),omen_hit:L('veyra','omen_hit_01','omen_hit_02','omen_hit_03','omen_hit_04'),omen_miss:L('veyra','omen_miss_01','omen_miss_02','omen_miss_03','omen_miss_04'),
    round_win:L('veyra','round_win_01','round_win_02','round_win_03'),round_loss:L('veyra','round_loss_01','round_loss_02','round_loss_03'),
    match_win:L('veyra','match_win_01','match_win_02','match_win_03'),match_loss:L('veyra','match_loss_01','match_loss_02','match_loss_03')
  }),
  // Gorvan: the quietest guest. His title lines are kept for the people who use the
  // title (his banter); the pulse remark always brings its own retraction.
  gorvan:Object.freeze({
    intro:L('gorvan','intro_01','intro_02','intro_03','intro_04'),idle:L('gorvan','idle_02','idle_03','idle_04','flavor_02','flavor_04'),slow:L('gorvan','idle_01'),
    other_good_move:L('gorvan','player_good_move_01','player_good_move_02','player_good_move_03','player_good_move_04'),own_good_move:L('gorvan','good_move_01','good_move_02','good_move_03'),
    other_draw:L('gorvan','player_draw_01','player_draw_03'),own_draw:L('gorvan','draw_01','draw_02','draw_03'),
    curse_taken:L('gorvan','curse_received_01','curse_01'),curse_landed:L('gorvan','curse_02','good_move_04'),stop_given:L('gorvan','stop_01'),stop_taken:L('gorvan','stop_02'),king:L('gorvan','king_01','king_02'),
    other_one_card:L('gorvan','player_one_card_01','player_one_card_02','player_one_card_03','player_one_card_04'),own_one_card:L('gorvan','one_card_01','one_card_02','one_card_03'),
    round_win:L('gorvan','round_win_01','round_win_02','round_win_03'),round_loss:L('gorvan','round_loss_01','round_loss_02','round_loss_03'),
    match_win:L('gorvan','match_win_01','match_win_02','match_win_03','match_win_04'),match_loss:L('gorvan','match_loss_01','match_loss_02','match_loss_03','match_loss_04')
  })
});

// "Still lucky." only follows his own "Lucky." earlier in the same match.
const REQUIRES=Object.freeze({bramm_player_good_move_02:'bramm_player_good_move_01'});
// Lines that are only true in a particular moment, judged from the speaker's seat.
const VOICE_WHEN=Object.freeze({
  // Her first sign of the evening to land is the loudest.
  veyra_omen_hit_03:c=>!c.first,veyra_omen_hit_04:c=>!c.first,
  veyra_omen_01:c=>c.kind==='draw',veyra_omen_02:c=>c.kind==='red',veyra_omen_03:c=>c.kind==='turn',veyra_omen_04:c=>c.kind==='regret',
  // "I have had enough of kings." — a King that just broke HIS Curse. "Ah. Royalty." otherwise.
  gorvan_king_02:(c,seat)=>!!c.victim&&c.victim===seat,gorvan_king_01:(c,seat)=>c.victim!==seat,
  // "Unfortunate." / "My condolences." are for a real haul.
  gorvan_good_move_04:c=>(c.amount||0)>=4||(c.victimCount??9)<=3,gorvan_player_draw_03:c=>(c.amount||0)>=4,
  veyra_player_draw_02:c=>(c.amount||0)>=4
});
// Two-beat performances by one guest: Ragna's "QUIET!" … "Thank you."; Gorvan's pulse
// remark and its retraction; his old rules and "No. Before your time."
const FOLLOW_UPS=Object.freeze({ragna_idle_04:{voice:'ragna_idle_05',chance:.6,delay:900,repeatable:true},gorvan_idle_04:{voice:'gorvan_idle_05',chance:.9,delay:700},gorvan_flavor_02:{voice:'gorvan_flavor_03',chance:.85,delay:1100}});

// How readily each guest talks (Edrin especially little: he is only half watching;
// Gorvan least of all: silence suits him).
export const TAVERN_GUEST_TALK=Object.freeze({kesh:1,edrin:.6,ragna:1,bramm:1.15,veyra:1,gorvan:.5});
// Chance that an eligible moment produces a line, for one guest at the table, before
// cooldowns and budgets. Most moments stay silent.
export const TAVERN_TRIGGER_CHANCE=Object.freeze({
  intro:.55,idle:.3,slow:.35,taunt:.18,mock:.1,shout:.22,
  other_good_move:.2,own_good_move:.14,setback:.3,surprised:.5,other_draw:.22,own_draw:.12,self_mistake:.65,
  skip:.25,curse:.2,reverse:.14,king:.24,brutal:.45,omen:.55,
  curse_taken:.3,curse_landed:.2,stop_given:.22,stop_taken:.22,
  omen_declare:.95,omen_hit:.9,omen_miss:.65,
  other_one_card:.3,own_one_card:.3,
  round_win:.35,round_loss:.12,match_win:.85,match_loss:.5
});
const HIGH=new Set(['other_one_card','own_one_card','omen_hit']),RESULT=new Set(['round_win','round_loss','match_win','match_loss']),INTRO='intro';
// Veyra's omen lines tell one small story (declared → hit or missed). They still take
// their turn on the table's single voice and its pacing, but they don't spend her
// ordinary per-match allowance, so the story can finish.
const OMEN_FAMILY=new Set(['omen_declare','omen_hit','omen_miss']);
// Two or three guests share the moments; they do not double (or triple) them.
export const TWO_GUEST_SCALE=.6,THREE_GUEST_SCALE=.45;
// One ordinary line per hand for the whole table, one last-card line per hand, and at most three
// non-result lines per guest per match (two when two guests share the table): a guest says
// roughly 2–5 things over five hands, and a banter is a once-in-a-while treat.
// v105: the guests trade lines more readily. Base odds roughly doubled, authored per-exchange
// odds scaled by `banterBoost` (capped at `banterChanceCap`), up to four exchanges a match with a
// 25 s gap, and an exchange no longer waits on the per-guest line cap or on a casual line already
// said this hand (it still needs the table quiet: casualGap / casualEvents, and at most two
// table moments per hand).
export const TAVERN_TIMING=Object.freeze({casualGap:15000,casualEvents:3,highGap:5000,banterGap:25000,perGuestCap:3,pairGuestCap:2,banterChance:.22,idleBanterChance:.28,banterBoost:1.6,banterChanceCap:.85,maxBanters:4,banterPerRound:1});

// Silent faces: what each guest's face does when something happens near them.
const FACES=Object.freeze({
  kesh:{own_draw:['bad_draw','save_for_later'],other_one_card:['player_one_card'],own_one_card:['kesh_one_card','road_clear'],other_good_move:['interesting_choice','close_observation'],own_good_move:['good_move_satisfaction','expected_result'],skip:['skip_interrupted'],curse:['curse_observation'],reverse:['reverse_observation'],king:['king_observation'],setback:['plans_disrupted','dry_annoyance'],idle:['watching_fire','drinking','intro_quiet_signs'],surprised:['reconsidering_omen']},
  edrin:{own_draw:['draw_sigh','useless_card'],other_one_card:['player_one_card_notice'],own_one_card:['edrin_one_card_notice'],other_good_move:['mildly_impressed','approving'],own_good_move:['good_move_casual','good_move_thinking'],brutal:['oh_dear','apologetic'],idle:['drinking','idle_distracted','looking_for_drink','mug_in_wrong_hand_search'],other_draw:['sympathetic']},
  ragna:{own_draw:['forced_draw_angry','recovering_focus'],other_one_card:['player_one_card_focus','player_one_card_excited'],own_one_card:['ragna_one_card','finish_strong'],other_good_move:['impressed_good_move','game_gets_interesting'],own_good_move:['strong_move_satisfied','keep_up'],idle:['impatient_focus','eyes_on_table'],self_mistake:['angry_at_self'],other_draw:['player_draw_more_fight']},
  bramm:{own_draw:['14_blame_the_deck'],other_one_card:['17_one_card_sober_shock','20_one_card_panic'],other_good_move:['08_dismissive_lucky'],own_good_move:['10_satisfied_good_move','11_showing_off'],setback:['15_defensive_excuse','09_irritated_lucky'],idle:['34_drinking_relaxed','33_muttering'],other_draw:['12_mock_generous']},
  // Veyra reacts to nearly everything with her face; the bones and the candle only
  // when she is actually consulting them.
  veyra:{own_draw:['draw_why_this_one','draw_reinterpretation'],curse_taken:['curse_offended','draw_no_no_no'],curse_landed:['curse_approving'],stop_taken:['stop_interpreting'],stop_given:['stop_pleased'],king:['king_suspicious'],reverse_seen:['idle_did_you_see_that','idle_means_something'],other_one_card:['player_one_card_alarm','player_one_card_connecting'],own_one_card:['veyra_one_card','veyra_one_card_certain'],other_good_move:['player_good_move_reconsidering','idle_did_you_see_that'],own_good_move:['good_move_satisfied','good_move_knew_it'],idle:['idle_means_something','intro_something_wrong','idle_did_you_see_that','intro_bones'],other_draw:['player_draw_interested'],omen_hit:['omen_hit_pointing','omen_hit_delighted'],omen_miss:['omen_miss_rationalizing','omen_miss_shut_up'],slow_seen:['intro_something_wrong']},
  // Gorvan: small glances, a narrower look; never a big face.
  gorvan:{own_draw:['not_ideal','silent_down'],curse_taken:['rude','dry_amusement'],curse_landed:['silent_narrow'],stop_taken:['silent_opponent'],stop_given:['firm_stop'],king:['dry_amusement'],other_one_card:['attentive'],own_one_card:['certainty'],other_good_move:['approval','silent_opponent'],own_good_move:['silent_narrow','certainty'],idle:['silent_down','silent_opponent','curious','reminiscing'],other_draw:['sympathetic'],slow:['silent_opponent']}
});
// How readily a guest's face reacts at all (1 = as everyone).
const FACE_RATE=Object.freeze({veyra:1.15,gorvan:.75});
const RESULT_FACES=Object.freeze({
  kesh:{round_win:'round_win',round_loss:'round_loss',match_win:'match_win',match_loss:'match_loss'},
  edrin:{round_win:'round_win_casual',round_loss:'round_loss',match_win:'match_win_content',match_loss:'match_loss_content'},
  ragna:{round_win:'round_win',round_loss:'round_loss_frustrated',match_win:'match_win_good_fight',match_loss:'match_loss_respect'},
  bramm:{round_win:'27_smug_unbeaten',round_loss:'31_again',match_win:'24_big_victory',match_loss:'30_defeated_sulk'},
  veyra:{round_win:'round_win_pattern',round_loss:'round_loss_show_me_again',match_win:'match_win_knew_it',match_loss:'match_loss_completely_wrong'},
  gorvan:{round_win:'certainty',round_loss:'sincere_nod',match_win:'pleasant',match_loss:'sincere_nod'}
});

// ── Banter: authored exchanges, each ONE performance ─────────────────────────
// `lines` are [guest, voice] (or [guest, voice, pause ms]) in authored order. Each
// exchange runs at most once a match, at most two a match, and only when every line
// is literally true at that moment. Silence beats a wrong line. `audio:'en'` marks an
// exchange recorded only in English (banter.js): in Hebrew it is text only.
// `requires` names an exchange that must have been heard before (on any evening).
const brutal=c=>(c.amount||0)>=4||(c.victimCount??9)<=3;
const B=(id,on,lines,extra={})=>Object.freeze({id,on,lines:Object.freeze(lines.map(item=>Object.freeze(item))),audio:'all',...extra});
export const TAVERN_BANTER=Object.freeze([
  B('silence_apparently','idle',[['ragna','ragna_idle_04'],['edrin','edrin_idle_01']]),
  B('pay_attention','slow',[['ragna','ragna_idle_02'],['edrin','edrin_idle_02']],{when:(c,s)=>c.current===s.edrin}),
  B('one_card_pressure','one_card',[['ragna','ragna_one_card_02'],['edrin','edrin_idle_01']],{when:(c,s)=>c.actor===s.ragna,chance:.1}),
  B('demands_admiration','good_move',[['bramm','bramm_bramm_good_move_02'],['kesh','kesh_player_good_move_03']],{when:(c,s)=>c.actor===s.bramm}),
  B('tavern_reviews','idle',[['bramm','bramm_idle_02'],['edrin','edrin_idle_03']]),
  B('keep_up','good_move',[['ragna','ragna_good_move_02'],['bramm','bramm_excuse_01']],{when:(c,s)=>c.actor===s.ragna&&c.victim===s.bramm}),
  B('two_opinions','good_move',[['ragna','ragna_player_good_move_01'],['bramm','bramm_player_good_move_01']],{when:(c,s)=>c.actor!==s.ragna&&c.actor!==s.bramm}),
  // Edrin's apologies need a genuinely brutal Curse of his (the same test as his own "brutal" line).
  B('sorry_doesnt_count','penalty',[['edrin','edrin_brutal_move_01'],['bramm','bramm_excuse_01']],{when:(c,s)=>c.source===s.edrin&&c.victim===s.bramm&&brutal(c)}),
  B('oh_dear_damn','penalty',[['edrin','edrin_brutal_move_02'],['ragna','ragna_draw_01']],{when:(c,s)=>c.source===s.edrin&&c.victim===s.ragna&&brutal(c)}),
  B('victory_thirst','match_end',[['bramm','bramm_win_09'],['edrin','edrin_match_loss_03']],{when:(c,s)=>c.champion===s.bramm,chance:.4}),
  B('quiet_bramm','slow',[['bramm','bramm_taunt_02'],['ragna','ragna_idle_04']],{when:(c,s)=>c.current!==s.bramm&&c.current!==s.ragna}),
  // A setback is Bramm's reading of a Shield, a King or a big Curse landing on him.
  B('house_rule',['skip','king','penalty'],[['bramm','bramm_excuse_02'],['kesh','kesh_annoyed_03']],{when:(c,s,type)=>c.victim===s.bramm&&(type!=='penalty'||(c.amount||0)>=4)}),

  // ── Veyra (v104) ──
  // Veyra + Kesh: two people who believe in signs, and nothing else in common.
  B('veyra_kesh_flame','idle',[['veyra','veyra_banter_kesh_01a'],['kesh','kesh_banter_veyra_01b',900],['veyra','veyra_banter_kesh_01c',450]],{chance:.32}),
  B('veyra_kesh_screaming',['reverse','king','omen'],[['kesh','kesh_banter_veyra_02a'],['veyra','veyra_banter_kesh_02b',380],['kesh','kesh_banter_veyra_02c',1300]],{chance:.32,when:(c,s,type)=>type!=='omen'||(c.actor===s.kesh&&c.phase==='reading')}),
  // Veyra + Ragna: deliberately two lines. That is the whole joke.
  B('veyra_ragna_focus',['idle','slow'],[['veyra','veyra_banter_ragna_01a'],['ragna','ragna_banter_veyra_01d',420]],{chance:.2,when:(c,s,type)=>type==='idle'||c.current===s.veyra||c.current===s.ragna}),
  // Veyra + Edrin: "...and then the King appeared." — so it follows a King, while it is fresh.
  B('veyra_edrin_signs','king',[['veyra','veyra_banter_edrin_01a'],['edrin','edrin_banter_veyra_01b',1300],['veyra','veyra_banter_edrin_01c',650]],{chance:.35}),

  // ── Gorvan (v104): English recordings only — text only in Hebrew ──
  B('gorvan_bramm_lord',['intro','idle'],[['bramm','bramm_banter_gorvan_01a'],['gorvan','gorvan_title_01',900]],{audio:'en'}),
  B('gorvan_bramm_noble','idle',[['bramm','bramm_banter_gorvan_02a'],['gorvan','gorvan_curse_received_01',800]],{audio:'en'}),
  B('gorvan_bramm_again',['intro','idle'],[['bramm','bramm_banter_gorvan_03a'],['gorvan','gorvan_title_04',1000]],{audio:'en',requires:'gorvan_bramm_lord',chance:.3}),
  B('gorvan_ragna_lord',['intro','idle'],[['ragna','ragna_banter_gorvan_01a'],['gorvan','gorvan_title_03',700]],{audio:'en'}),
  B('gorvan_ragna_sunrise','slow',[['ragna','ragna_banter_gorvan_02a'],['gorvan','gorvan_idle_01',900]],{audio:'en',when:(c,s)=>c.current===s.gorvan,chance:.4}),
  B('gorvan_edrin_voice','idle',[['edrin','edrin_banter_gorvan_01a'],['gorvan','gorvan_idle_03',1000]],{audio:'en',when:(c,s,type,d)=>d.spoke('gorvan')}),
  B('gorvan_edrin_relax','idle',[['edrin','edrin_banter_gorvan_02a'],['gorvan','gorvan_idle_02',900]],{audio:'en'}),
  B('gorvan_kesh_night','idle',[['kesh','kesh_banter_gorvan_01a'],['gorvan','gorvan_idle_03',1100]],{audio:'en'}),
  B('gorvan_kesh_patient','slow',[['kesh','kesh_banter_gorvan_02a'],['gorvan','gorvan_idle_01',1000]],{audio:'en',when:(c,s)=>c.current!==s.gorvan&&c.current!==s.kesh,chance:.3}),
  // Veyra + Gorvan: energy meets a wall of calm. He treats it as her problem.
  B('gorvan_veyra_signs','omen_miss',[['veyra','veyra_banter_gorvan_01a'],['gorvan','gorvan_idle_05',800]],{audio:'en',when:(c,s)=>c.actor===s.veyra,chance:.5}),
  B('gorvan_veyra_flame','idle',[['veyra','veyra_banter_gorvan_02a'],['gorvan','gorvan_idle_03',900]],{audio:'en',chance:.2}),
  B('gorvan_veyra_shadow',['intro','idle'],[['veyra','veyra_banter_gorvan_03a'],['gorvan','gorvan_idle_05',900]],{audio:'en',chance:.2}),

  // ── v106: thirteen new exchanges (English recordings; Hebrew is subtitle text) ──
  // The three pairs who had nothing to say to each other.
  B('veyra_bramm_warning','good_move',[['veyra','veyra_banter_bramm_01a'],['bramm','bramm_banter_veyra_01b',700]],{audio:'en',when:(c,s)=>c.actor===s.bramm}),
  B('veyra_bramm_destiny','one_card',[['bramm','bramm_banter_veyra_02a'],['veyra','veyra_banter_bramm_02b',700],['bramm','bramm_banter_veyra_02c',550]],{audio:'en',when:(c,s)=>c.actor===s.bramm}),
  B('edrin_kesh_stone','idle',[['edrin','edrin_banter_kesh_01a'],['kesh','kesh_banter_edrin_01b',900],['edrin','edrin_banter_kesh_01c',650]],{audio:'en'}),
  B('edrin_kesh_strategy','good_move',[['edrin','edrin_banter_kesh_02a'],['kesh','kesh_banter_edrin_02b',800],['edrin','edrin_banter_kesh_02c',700]],{audio:'en',when:(c,s)=>c.actor===s.kesh}),
  B('ragna_kesh_thinking','slow',[['ragna','ragna_banter_kesh_01a'],['kesh','kesh_banter_ragna_01b',900],['ragna','ragna_banter_kesh_01c',450]],{audio:'en',when:(c,s)=>c.current===s.kesh}),
  B('ragna_kesh_course','reverse',[['kesh','kesh_banter_ragna_02a'],['ragna','ragna_banter_kesh_02b',500],['kesh','kesh_banter_ragna_02c',1000],['ragna','ragna_banter_kesh_02d',500]],{audio:'en',when:(c,s)=>c.actor===s.ragna}),
  // Existing pairs, a second exchange each.
  B('veyra_ragna_sacred','idle',[['veyra','veyra_banter_ragna_02a'],['ragna','ragna_banter_veyra_02b',600],['veyra','veyra_banter_ragna_02c',500],['ragna','ragna_banter_veyra_02d',600]],{audio:'en'}),
  B('veyra_edrin_bones','idle',[['veyra','veyra_banter_edrin_02a'],['edrin','edrin_banter_veyra_02b',800],['veyra','veyra_banter_edrin_02c',500],['edrin','edrin_banter_veyra_02d',900]],{audio:'en'}),
  // Gorvan in his own recorded words.
  B('gorvan_bramm_speech','penalty',[['gorvan','gorvan_banter_bramm_04a'],['bramm','bramm_banter_gorvan_04b',500],['gorvan','gorvan_banter_bramm_04c',1000]],{audio:'en',when:(c,s)=>c.victim===s.bramm&&(c.amount||0)===4}),
  B('gorvan_ragna_hurry','slow',[['ragna','ragna_banter_gorvan_03a'],['gorvan','gorvan_banter_ragna_03b',900],['ragna','ragna_banter_gorvan_03c',500],['gorvan','gorvan_banter_ragna_03d',1100]],{audio:'en',when:(c,s)=>c.current===s.gorvan}),
  B('gorvan_edrin_wine','idle',[['edrin','edrin_banter_gorvan_03a'],['gorvan','gorvan_banter_edrin_03b',800],['edrin','edrin_banter_gorvan_03c',900]],{audio:'en'}),
  // Best right after Kesh has consulted his stone; otherwise a quiet stretch.
  B('gorvan_kesh_future',['omen','idle'],[['kesh','kesh_banter_gorvan_03a'],['gorvan','gorvan_banter_kesh_03b',1000]],{audio:'en',when:(c,s,type)=>type!=='omen'||(c.actor===s.kesh&&c.phase==='reading')}),
  B('gorvan_veyra_seven','penalty',[['veyra','veyra_banter_gorvan_04a'],['gorvan','gorvan_banter_veyra_04b',1000]],{audio:'en',when:(c,s)=>c.source===s.gorvan&&brutal(c)})
]);

export const reactionFor=(guest,voice)=>AUTHORED_CHARACTERS[guest]?.reactions.find(item=>item.voice===voice)||(BANTER_RECORDINGS[voice]?.speaker===guest?banterReaction(voice):null);
export const guestHasVoice=(guest,voice,locale)=>!!AUTHORED_CHARACTERS[guest]?.resolveVoice(voice,locale)||(BANTER_RECORDINGS[voice]?.speaker===guest&&BANTER_RECORDINGS[voice].takes.includes(locale==='he'?'he':'en'));
// Every recording a guest might play at a Tavern table (pools, follow-ups and banter), to warm in the background.
export const allTavernVoices=guest=>[...new Set(Object.values(TAVERN_GUEST_POOLS[guest]||{}).flat()
  .concat(Object.values(FOLLOW_UPS).map(item=>item.voice).filter(voice=>voice.startsWith(`${guest}_`)))
  .concat(TAVERN_BANTER.flatMap(b=>b.lines).filter(([who])=>who===guest).map(([,voice])=>voice)))];

// `seats` maps seat id → guest id (e.g. {p2:'ragna',p3:'bramm'}). `heard` lists the
// banter exchanges this player has heard on earlier evenings (for running jokes).
export function createTavernDirector({seats={},random=Math.random,now=()=>Date.now(),locale=()=>'en',captions=()=>true,initial=null,heard=[]}={}){
  const guestSeats=Object.entries(seats),bySeat=new Map(guestSeats),seatOf=Object.fromEntries(guestSeats.map(([seat,id])=>[id,seat]));
  const scale=guestSeats.length>=3?THREE_GUEST_SCALE:guestSeats.length===2?TWO_GUEST_SCALE:1,T=TAVERN_TIMING;
  const used=new Set(initial?.used||[]),usedWords=new Set(initial?.usedWords||[]),banters=new Set(initial?.banters||[]),casualBy={...(initial?.casualBy||{})},everHeard=new Set(heard);
  let lastSpokenAt=-Infinity,lastBanterAt=-Infinity,eventsSince=99,eventsThisRound=0,casualThisRound=0,bantersThisRound=0,highThisRound=0,shouts=initial?.shouts||0,lastFaceAt={},log=[...(initial?.log||[])];
  const words=(guest,voice)=>reactionFor(guest,voice)?.caption?.toLowerCase().replace(/[^a-z ]/g,'').trim();
  const lineTrue=(guest,voice,c={})=>{const seat=seatOf[guest],test=VOICE_WHEN[voice];return !test||test(c,seat);};
  const available=(guest,voice,{allowUsed=false,textOnly=false}={})=>{
    if(!reactionFor(guest,voice))return false;
    // Text-only (an English-only exchange in Hebrew): the authored Hebrew words must exist.
    if(textOnly){if(!reactionFor(guest,voice).captions?.[locale()==='he'?'he':'en'])return false;}
    else if(!guestHasVoice(guest,voice,locale()))return false;
    if(REQUIRES[voice]&&!used.has(REQUIRES[voice]))return false;
    if(!allowUsed&&(used.has(voice)||usedWords.has(words(guest,voice))))return false;
    return true;
  };
  const OMEN_BY_PHASE={touch:'kesh_omen_01',reading:'kesh_omen_02',realization:'kesh_omen_03'};
  const pick=(guest,trigger,c={})=>{
    // Each moment of the stone tell has its own line.
    const pool=(trigger==='omen'?[OMEN_BY_PHASE[c.phase]].filter(Boolean):(TAVERN_GUEST_POOLS[guest]?.[trigger]||[])).filter(voice=>available(guest,voice)&&lineTrue(guest,voice,c));
    // Every line is heard at most once a match; when a pool is spent, that guest stays quiet.
    return pool.length?pool[Math.floor(random()*pool.length)]:null;
  };
  const say=(seat,guest,voice,extra={})=>({seat,guest,voice,reaction:reactionFor(guest,voice),...extra});
  const remember=(lines,{banter=null,trigger=null}={})=>{
    for(const line of lines){used.add(line.voice);usedWords.add(words(line.guest,line.voice));log.push({guest:line.guest,voice:line.voice,trigger,banter,at:Math.round(now())});}
    log=log.slice(-30);lastSpokenAt=now();eventsSince=0;
    if(banter){banters.add(banter);everHeard.add(banter);lastBanterAt=now();}
  };
  const cap=guestSeats.length>=2?T.pairGuestCap:T.perGuestCap;
  // `uncapped` (Veyra's omen story): outside the per-guest allowance, and a sign that runs out
  // may still be argued with in the hand it was declared in — after the table's usual quiet.
  const gateCasual=(guest,{uncapped=false,anyRound=false}={})=>eventsSince>=T.casualEvents&&now()-lastSpokenAt>=T.casualGap&&(anyRound||casualThisRound<1)&&(uncapped||(casualBy[guest]||0)<cap);
  const gateHigh=(guest,{uncapped=false}={})=>now()-lastSpokenAt>=T.highGap&&highThisRound<1&&(uncapped||(casualBy[guest]||0)<cap);
  const spoke=guest=>log.some(item=>item.guest===guest&&item.trigger!=='debug');

  // Which trigger an event means for a given guest seat (null: nothing for them).
  function triggerFor(type,seat,guest,c){
    const own=c.actor===seat,modern=guest==='veyra'||guest==='gorvan';
    switch(type){
      case 'intro':return 'intro';
      case 'idle':return guest==='bramm'&&c.current&&c.current!==seat&&random()<.4?'taunt':guest==='ragna'&&random()<.3?'shout':'idle';
      case 'slow':if(!c.current||c.current===seat)return null;return guest==='veyra'?'slow_seen':'slow';
      case 'move':return guest==='bramm'&&!own&&c.actor?'mock':null;
      case 'good_move':return own?'own_good_move':'other_good_move';
      case 'draw':if(own)return guest==='ragna'&&c.slip?'self_mistake':'own_draw';return guest==='bramm'?'other_draw':null;
      case 'penalty':
        if(modern){if(c.victim===seat)return 'curse_taken';if(c.source===seat)return 'curse_landed';return (c.amount||0)>=4?'other_draw':null;}
        if(c.victim===seat)return (c.amount||0)>=4&&(guest==='bramm'||guest==='kesh')?'setback':'own_draw';
        if(guest==='edrin'&&c.source===seat&&brutal(c))return 'brutal';
        if(guest==='kesh'&&(c.amount||0)>=2)return 'curse';
        return (c.amount||0)>=4?'other_draw':null;
      case 'skip':
        if(modern){if(c.victim===seat)return 'stop_taken';if(c.actor===seat)return 'stop_given';return null;}
        return c.victim===seat?(guest==='kesh'?'skip':guest==='bramm'?'setback':null):null;
      case 'king':
        if(modern)return own?null:'king';
        if(guest==='kesh')return 'king';return guest==='bramm'&&c.victim===seat?'setback':null;
      case 'reverse':return guest==='kesh'?'reverse':guest==='veyra'?'reverse_seen':null;
      case 'one_card':return own?'own_one_card':'other_one_card';
      case 'omen':return guest==='kesh'&&c.actor===seat?'omen':null;
      case 'omen_failed':return guest==='kesh'&&c.actor===seat?'surprised':null;
      case 'omen_declare':return guest==='veyra'&&c.actor===seat?'omen_declare':null;
      case 'omen_hit':return guest==='veyra'&&c.actor===seat?'omen_hit':null;
      case 'omen_miss':return guest==='veyra'&&c.actor===seat?'omen_miss':null;
      case 'round_end':return c.winner===seat?'round_win':'round_loss';
      case 'match_end':return c.champion===seat?'match_win':'match_loss';
      default:return null;
    }
  }
  function faceFor(guest,trigger){const options=FACES[guest]?.[trigger];return options?options[Math.floor(random()*options.length)]:null;}

  function tryBanter(type,c){
    const chanceBase=type==='idle'||type==='slow'?T.idleBanterChance:T.banterChance,he=locale()==='he';
    if(banters.size>=T.maxBanters||now()-lastBanterAt<T.banterGap)return null;
    if(type!=='match_end'&&(now()-lastSpokenAt<T.casualGap||eventsSince<T.casualEvents||casualThisRound>=2||bantersThisRound>=T.banterPerRound))return null;
    const candidates=TAVERN_BANTER.filter(b=>{
      if(![].concat(b.on).includes(type)||banters.has(b.id))return false;
      if(b.requires&&!everHeard.has(b.requires))return false;
      const guests=[...new Set(b.lines.map(([guest])=>guest))];
      if(!guests.every(guest=>seatOf[guest]))return false;
      // Recorded in English only: voiced in English; in Hebrew, authored text alone — and only if bubbles are on.
      const textOnly=b.audio==='en'&&he;if(textOnly&&!captions())return false;
      if(b.when&&!b.when(c,seatOf,type,{spoke}))return false;
      return b.lines.every(([guest,voice])=>available(guest,voice,{textOnly}));
    });
    if(type==='slow'||type==='idle')for(const b of [...candidates])if(b.lines.some(([,voice])=>voice==='ragna_idle_04'))if(shouts>=1)candidates.splice(candidates.indexOf(b),1);
    for(const b of candidates.toSorted(()=>random()-.5)){
      if(random()>(b.chance!=null?Math.min(T.banterChanceCap,b.chance*T.banterBoost):chanceBase))continue;
      const textOnly=b.audio==='en'&&he;
      const lines=b.lines.map(([guest,voice,pause],index)=>say(seatOf[guest],guest,voice,{...(index?{pause:pause??600+Math.floor(random()*900)}:{}),...(textOnly?{silent:true}:{})}));
      if(b.lines.some(([,voice])=>voice==='ragna_idle_04'))shouts++;
      remember(lines,{banter:b.id,trigger:type});
      for(const guest of new Set(b.lines.map(([guest])=>guest)))if(!RESULT.has(type))casualBy[guest]=(casualBy[guest]||0)+1;
      if(type!=='match_end'){casualThisRound++;bantersThisRound++;}
      return {banter:b.id,lines};
    }
    return null;
  }

  // One table event → at most one line (or one banter), plus a few silent faces.
  function event(type,c={}){
    if(!guestSeats.length)return {faces:[],lines:[]};
    const counted=!['idle','slow','omen','intro','omen_declare','omen_hit','omen_miss'].includes(type);
    if(counted){eventsSince++;eventsThisRound++;}
    const faces=[],guestsInvolved=guestSeats.map(([seat,guest])=>({seat,guest,trigger:triggerFor(type,seat,guest,c)})).filter(item=>item.trigger);
    const result=type==='round_end'||type==='match_end';
    let plan=null;
    if(!c.busy&&!c.muted){
      plan=tryBanter(type,c);
      if(!plan){
        // One line per event at most. Results: the winner first, then (rarely) one of the losing guests.
        const order=result?guestsInvolved.toSorted((a,b)=>(b.trigger.endsWith('win')?1:0)-(a.trigger.endsWith('win')?1:0)||random()-.5):guestsInvolved.toSorted(()=>random()-.5);
        for(const item of order){
          const {seat,guest,trigger}=item,high=HIGH.has(trigger),isResult=RESULT.has(trigger),omenLine=OMEN_FAMILY.has(trigger);
          if(trigger==='intro'&&c.introDone)break;
          if(trigger==='shout'&&shouts>=1)continue;
          // A landed omen that had to wait for a voice to end is delivered as soon as the table is free.
          const forced=!!c.force&&trigger==='omen_hit';
          if(!isResult&&trigger!==INTRO&&!forced&&!(high?gateHigh(guest,{uncapped:omenLine}):gateCasual(guest,{uncapped:omenLine,anyRound:trigger==='omen_miss'})))continue;
          const voice=pick(guest,trigger,{...c,self:seat});if(!voice)continue;
          // One roll per moment for the whole table: the first guest who could speak gets the chance, nobody else.
          const chance=(TAVERN_TRIGGER_CHANCE[trigger]??0)*(omenLine?1:TAVERN_GUEST_TALK[guest])*(isResult||trigger===INTRO||omenLine?1:scale);
          if(!forced&&random()>chance)break;
          const lines=[say(seat,guest,voice)];
          const follow=FOLLOW_UPS[voice];if(follow&&random()<follow.chance&&available(guest,follow.voice,{allowUsed:!!follow.repeatable}))lines.push(say(seat,guest,follow.voice,{pause:follow.delay}));
          if(trigger==='shout')shouts++;
          remember(lines,{trigger});
          if(!isResult&&trigger!==INTRO){if(high)highThisRound++;else casualThisRound++;if(!omenLine)casualBy[guest]=(casualBy[guest]||0)+1;}
          plan={lines};break;
        }
      }
    }
    // Faces: everyone involved who is not speaking may react silently; results hold their face.
    const speaking=new Set((plan?.lines||[]).map(line=>line.seat));
    for(const {seat,guest,trigger} of guestsInvolved){
      if(speaking.has(seat))continue;
      if(result){const face=RESULT_FACES[guest]?.[trigger];if(face)faces.push({seat,expression:face,duration:0});continue;}
      const face=faceFor(guest,trigger);if(!face)continue;
      const always=HIGH.has(trigger)||OMEN_FAMILY.has(trigger);
      if(now()-(lastFaceAt[seat]||-Infinity)<2500&&!always)continue;
      if(!always&&random()>(trigger==='idle'?.6:.55)*(FACE_RATE[guest]??1))continue;
      lastFaceAt[seat]=now();faces.push({seat,expression:face,duration:always?2100:1700});
    }
    return {faces,lines:plan?.lines||[],banter:plan?.banter||null};
  }
  return Object.freeze({
    event,
    beginRound(){casualThisRound=0;bantersThisRound=0;highThisRound=0;eventsThisRound=0;eventsSince=99;},
    seats:()=>({...seats}),seatOf:guest=>seatOf[guest]||null,
    // Debug: play a given line or banter regardless of chance (still never repeats a banter).
    force(voice){const entry=guestSeats.find(([,guest])=>reactionFor(guest,voice));if(!entry)return null;const lines=[say(entry[0],entry[1],voice)];remember(lines,{trigger:'debug'});return {lines,faces:[]};},
    forceBanter(id){const b=TAVERN_BANTER.find(item=>item.id===id);if(!b||!b.lines.every(([guest])=>seatOf[guest]))return null;const textOnly=b.audio==='en'&&locale()==='he';const lines=b.lines.map(([guest,voice,pause],index)=>say(seatOf[guest],guest,voice,{...(index?{pause:pause??900}:{}),...(textOnly?{silent:true}:{})}));remember(lines,{banter:b.id,trigger:'debug'});return {lines,faces:[],banter:b.id};},
    heard:()=>[...everHeard],
    snapshot:()=>({seats:{...seats},used:[...used],usedWords:[...usedWords],banters:[...banters],casualBy:{...casualBy},shouts,log:log.map(item=>({...item}))}),
    cooldown:()=>({quietMs:Number.isFinite(lastSpokenAt)?Math.round(now()-lastSpokenAt):null,casualReadyInMs:Math.max(0,Math.round(T.casualGap-(now()-lastSpokenAt)))||0,eventsSince,casualThisRound,highThisRound,banterReadyInMs:Math.max(0,Math.round(T.banterGap-(now()-lastBanterAt)))||0,bantersThisMatch:banters.size})
  });
}
