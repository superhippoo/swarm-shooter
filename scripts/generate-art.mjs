import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const files = new Map();

function asset(path, title, width, height, content) {
  files.set(path, `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" stroke-linecap="round" stroke-linejoin="round">
  <title>${title}</title>
${content}
</svg>
`);
}

const outline = '#071216';
const alienOutline = '#190e16';
const rivets = (points, color = '#668088') => points.map(([x, y]) =>
  `<circle cx="${x}" cy="${y}" r="2.2" fill="#0a1419"/><circle cx="${x - 0.5}" cy="${y - 0.6}" r="1" fill="${color}"/>`,
).join('');

asset('environment/floor.svg', 'Worn industrial deck panel', 256, 256, `
  <rect width="256" height="256" fill="#101a21"/>
  <path d="M0 0H256V256H0Z" fill="none" stroke="#182930" stroke-width="2"/>
  <path d="M4 4H252V252H4Z" fill="none" stroke="#132229"/>
  <path d="M8 8H248M8 8V248" fill="none" stroke="#2b3a40" stroke-width="1" opacity=".45"/>
  <path d="M14 248H248V14" fill="none" stroke="#070f15" stroke-width="2"/>
  <path d="M128 4V16M128 240V252M4 128H16M240 128H252" stroke="#31434a" opacity=".45"/>
  <path d="M32 186 76 182M34 190 57 188M182 54 215 51" stroke="#3c4b50" opacity=".22"/>
  <path d="M164 222 183 218 193 221M48 68 57 65 65 67" fill="none" stroke="#080f14" stroke-width="2" opacity=".5"/>
  ${rivets([[12, 12], [244, 12], [12, 244], [244, 244]], '#43575e')}
`);

asset('environment/bed.svg', 'Medical restraint bed with frame and mattress', 220, 112, `
  <ellipse cx="113" cy="91" rx="97" ry="13" fill="#03090d" opacity=".55"/>
  <g stroke="${outline}" stroke-width="3">
    <path d="M26 75V96H37V78M181 76V96H192V74" fill="#243b43"/>
    <path d="M18 26 31 16H201L210 26V81L196 91H29L18 81Z" fill="#1b2b32"/>
    <path d="M18 26H210V69L196 79H29L18 70Z" fill="#4a6269"/>
    <path d="M25 29H203V64L192 72H32L25 65Z" fill="#243c43"/>
    <path d="M39 25H193V65H39Z" fill="#789497"/>
    <path d="M43 28H190V38H43Z" fill="#a0b8b5" stroke="none"/>
    <path d="M84 27H193V64H84Z" fill="#526e75"/>
    <path d="M91 29H190V38H91Z" fill="#69878a" stroke="none"/>
    <path d="M92 42H189M92 58H189" stroke="#3a525a" stroke-width="2"/>
    <path d="M39 31 49 25H76L82 33V57L73 63H42Z" fill="#b0c4bd"/>
    <path d="M45 31 51 28H72L76 33" fill="none" stroke="#d3ded2" stroke-width="2"/>
    <path d="M111 26H120V65H111ZM161 26H170V65H161Z" fill="#26363e"/>
    <path d="M112 42H119M162 42H169" stroke="#d6a647" stroke-width="3"/>
    <path d="M17 22H27V82H17ZM201 23H211V81H201Z" fill="#668088"/>
    <path d="M20 26H24V65M204 28V63" stroke="#a0b8b5" stroke-width="2"/>
    <path d="M25 85H201" stroke="#15252c" stroke-width="5"/>
  </g>
  <path d="M185 80H196V86H185Z" fill="#39e6d0" opacity=".6"/>
  ${rivets([[28, 75], [201, 75], [28, 32], [201, 32]])}
`);

asset('environment/console.svg', 'Industrial control console with three illuminated screens', 320, 124, `
  <ellipse cx="160" cy="106" rx="146" ry="12" fill="#03090d" opacity=".6"/>
  <g stroke="${outline}" stroke-width="3">
    <path d="M17 38 35 17H285L305 37V93L288 106H34L17 93Z" fill="#15272e"/>
    <path d="M17 37H305V80L287 94H35L17 81Z" fill="#38525b"/>
    <path d="M27 39H295V72L282 83H40L27 72Z" fill="#1b3037"/>
    <path d="M34 82H288V94H34Z" fill="#263d45"/>
    <path d="M39 89H283" stroke="#597079" stroke-width="2"/>
    <path d="M44 23H115L121 58H39Z" fill="#07171d"/>
    <path d="M128 23H194L198 58H124Z" fill="#07171d"/>
    <path d="M207 23H278L283 58H202Z" fill="#07171d"/>
    <path d="M48 28H110L114 51H45Z" fill="#174449" stroke="#2c6c70" stroke-width="2"/>
    <path d="M133 28H189L192 51H130Z" fill="#173940" stroke="#2c6c70" stroke-width="2"/>
    <path d="M212 28H273L277 51H209Z" fill="#174449" stroke="#2c6c70" stroke-width="2"/>
  </g>
  <g fill="none" stroke="#57b6af" stroke-width="2" opacity=".72">
    <path d="M52 44V34H61M65 34H81M65 39H102M65 44H93"/>
    <path d="M137 43 145 36 153 41 162 31 171 39 184 33"/>
    <path d="M216 34H232V44H216ZM240 34H269M240 39H260M240 44H265"/>
  </g>
  <g fill="#789497" stroke="#101f26" stroke-width="2">
    <path d="M46 64H61V73H46ZM68 64H83V73H68ZM90 64H105V73H90Z"/>
    <path d="M213 64H228V73H213ZM235 64H250V73H235ZM257 64H272V73H257Z"/>
  </g>
  <path d="M133 64H187V75H133Z" fill="#0b1d24" stroke="#46646b" stroke-width="2"/>
  <path d="M141 69H180" stroke="#f5b942" stroke-width="3" opacity=".7"/>
  ${rivets([[27, 87], [295, 87], [27, 44], [295, 44]])}
`);

asset('environment/wall.svg', 'Armored wall segment with top bevel and side face', 320, 112, `
  <ellipse cx="160" cy="98" rx="155" ry="9" fill="#03090d" opacity=".55"/>
  <g stroke="${outline}" stroke-width="3">
    <path d="M7 20 22 8H301L314 20V84L300 99H20L7 86Z" fill="#1b2a31"/>
    <path d="M7 20H314V66L300 81H20L7 68Z" fill="#465c63"/>
    <path d="M17 23H304V58L293 68H28L17 59Z" fill="#2c4048"/>
    <path d="M24 26H297V33H24Z" fill="#61767a" stroke="none"/>
    <path d="M27 70H295V81H27Z" fill="#263b43"/>
    <path d="M110 22V69M211 22V69" stroke="#15262d" stroke-width="4"/>
    <path d="M115 26V62M216 26V62" stroke="#50656c" stroke-width="2"/>
    <path d="M7 43H17M304 43H314" stroke="#829594" stroke-width="4"/>
  </g>
  <path d="M129 72H190V78H129Z" fill="#0e1b21"/>
  <path d="M139 75H180" stroke="#f5b942" stroke-width="2" opacity=".35"/>
  ${rivets([[27, 45], [95, 45], [127, 45], [195, 45], [227, 45], [294, 45]])}
`);

asset('environment/vent.svg', 'Recessed ventilation turbine', 128, 128, `
  <ellipse cx="64" cy="72" rx="52" ry="48" fill="#060e13" opacity=".55"/>
  <path d="M16 21 30 10H101L115 24V101L101 114H28L14 101Z" fill="#293e46" stroke="${outline}" stroke-width="4"/>
  <path d="M24 26 34 19H95L105 29V96L95 105H33L23 96Z" fill="#101e25" stroke="#526970" stroke-width="2"/>
  <circle cx="64" cy="63" r="35" fill="#071217" stroke="#3a5159" stroke-width="3"/>
  <g fill="#263d45" stroke="#0b171d" stroke-width="2">
    <path d="M64 59C48 49 44 35 53 31 66 29 72 43 68 59Z"/>
    <path d="M68 63C78 47 92 44 96 53 97 66 84 71 68 67Z"/>
    <path d="M64 67C80 77 84 91 75 95 62 97 56 84 60 68Z"/>
    <path d="M60 63C50 79 36 82 32 73 31 60 44 55 60 59Z"/>
  </g>
  <circle cx="64" cy="63" r="8" fill="#4d646b" stroke="#101e24" stroke-width="3"/>
  <path d="M61 58 67 56" stroke="#92a5a5" stroke-width="2"/>
  ${rivets([[27, 27], [101, 27], [27, 101], [101, 101]])}
`);

asset('environment/pipe.svg', 'Floor-level conduit and retaining brackets', 256, 96, `
  <path d="M11 63H245" stroke="#050d12" stroke-width="20" opacity=".55"/>
  <path d="M11 53H245" stroke="#172b33" stroke-width="18"/>
  <path d="M11 48H245" stroke="#4b6269" stroke-width="9"/>
  <path d="M11 46H245" stroke="#718387" stroke-width="2" opacity=".55"/>
  <g fill="#263b42" stroke="#0b171d" stroke-width="3">
    <path d="M30 35H47V65H30ZM107 35H124V65H107ZM185 35H202V65H185Z"/>
  </g>
  ${rivets([[38, 40], [38, 59], [115, 40], [115, 59], [193, 40], [193, 59]])}
`);

asset('environment/elevator.svg', 'Northwest cargo extraction elevator platform', 320, 320, `
  <ellipse cx="160" cy="175" rx="144" ry="131" fill="#03090d" opacity=".5"/>
  <path d="M31 35 57 15H269L296 40V280L270 303H49L24 279Z" fill="#1c2c34" stroke="${outline}" stroke-width="5"/>
  <path d="M40 45 63 28H260L282 49V270L261 288H58L38 268Z" fill="#415760" stroke="#6a7f82" stroke-width="3"/>
  <path d="M55 58H266V258H55Z" fill="#1c3139" stroke="#0c1a21" stroke-width="5"/>
  <path d="M65 68H256V248H65Z" fill="#2c424a" stroke="#587078" stroke-width="2"/>
  <path d="M160 69V247M66 158H255" stroke="#101e26" stroke-width="5"/>
  <path d="M75 78H151V148H75ZM170 78H246V148H170ZM75 169H151V238H75ZM170 169H246V238H170Z" fill="#314952" stroke="#49616a" stroke-width="2"/>
  <g fill="#c99a3b" opacity=".55">
    <path d="M50 46H67V57H50ZM82 34H99V45H82ZM220 34H237V45H220ZM251 47H268V58H251Z"/>
    <path d="M49 260H66V271H49ZM81 274H98V285H81ZM221 274H238V285H221ZM253 260H270V271H253Z"/>
  </g>
  <path d="M142 121H179L163 99ZM142 193H179L163 215Z" fill="#f5b942" opacity=".65"/>
  <path d="M84 90H130M191 90H235" stroke="#7c9395" stroke-width="2" opacity=".5"/>
  ${rivets([[50, 61], [271, 61], [50, 256], [271, 256], [160, 45], [160, 274]])}
`);

asset('environment/relay.svg', 'Signal relay pedestal and directional antenna', 160, 160, `
  <ellipse cx="80" cy="126" rx="58" ry="20" fill="#03090d" opacity=".6"/>
  <path d="M29 107 42 87H118L132 107V127L115 142H46L29 128Z" fill="#172c34" stroke="${outline}" stroke-width="4"/>
  <path d="M29 106H132V122L114 133H47L29 123Z" fill="#47616a" stroke="${outline}" stroke-width="3"/>
  <path d="M45 62 59 46H102L117 62V108L103 120H58L45 108Z" fill="#29454d" stroke="${outline}" stroke-width="4"/>
  <path d="M52 65H110V98L99 108H61L52 99Z" fill="#12262f" stroke="#5b7479" stroke-width="2"/>
  <path d="M60 70H101V91H60Z" fill="#123e43" stroke="#3f7e7d" stroke-width="2"/>
  <path d="M67 84 74 77 81 82 94 73" fill="none" stroke="#69d2c2" stroke-width="2"/>
  <path d="M62 51H99" stroke="#8ba3a2" stroke-width="3"/>
  <path d="M75 49V25H87V49" fill="#526e75" stroke="${outline}" stroke-width="3"/>
  <path d="M43 17 80 7 118 17 111 37 81 46 50 37Z" fill="#304c55" stroke="${outline}" stroke-width="4"/>
  <path d="M54 20 80 14 107 20 102 29 81 35 59 29Z" fill="#769395" stroke="#142a32" stroke-width="2"/>
  <path d="M80 14V35" stroke="#bed0c7" stroke-width="2"/>
  <circle cx="81" cy="114" r="5" fill="#f5b942" stroke="#513f22" stroke-width="2"/>
  <path d="M43 114H55M106 114H118" stroke="#f5b942" stroke-width="3" opacity=".6"/>
`);

asset('environment/decal.svg', 'Worn directional deck markings', 256, 128, `
  <g fill="#8d9c8f" opacity=".18">
    <path d="M17 45H36V35L61 64 36 93V83H17ZM76 45H95V35L120 64 95 93V83H76ZM135 45H154V35L179 64 154 93V83H135Z"/>
  </g>
  <path d="M16 108H180M194 108H239" stroke="#7e928c" stroke-width="3" opacity=".16"/>
  <path d="M40 24H75M96 24H119M168 101H193" stroke="#101a21" stroke-width="5" opacity=".8"/>
`);

function legs(id, pose) {
  const scout = id === 'scout';
  const colors = scout
    ? { dark: '#18353d', armor: '#23636a', light: '#3b8b8b' }
    : { dark: '#1a333a', armor: '#425158', light: '#718087' };
  const a = pose === 'a' ? -9 : pose === 'b' ? 8 : 0;
  const b = -a;
  const limb = (y, offset, flip) => `
    <g transform="translate(0 ${offset})">
      <path d="M52 ${y - 8} 36 ${y - 13} 23 ${y - 10} 15 ${y - 4} 20 ${y + 7} 38 ${y + 10} 54 ${y + 4}Z" fill="${colors.dark}" stroke="${outline}" stroke-width="4"/>
      <path d="M47 ${y - 6} 35 ${y - 8} 27 ${y - 5} 31 ${y + 3} 46 ${y + 5}Z" fill="${colors.armor}" stroke="#11262d" stroke-width="2"/>
      <path d="M24 ${y - 6} 13 ${y - 5} ${flip ? 8 : 10} ${y + 1} 16 ${y + 7} 29 ${y + 5}Z" fill="#152a32" stroke="${outline}" stroke-width="3"/>
      <path d="M30 ${y - 6} 40 ${y - 5}" stroke="${colors.light}" stroke-width="2"/>
    </g>`;
  return `
  <ellipse cx="58" cy="68" rx="38" ry="31" fill="#02090d" opacity=".36"/>
  ${limb(43, a, true)}
  ${limb(83, b, false)}
  <path d="M45 53 58 50 67 64 58 78 45 74 39 64Z" fill="${colors.dark}" stroke="${outline}" stroke-width="3"/>
  <path d="M48 58 56 56 60 64 56 72 48 70" fill="${colors.armor}" stroke="none"/>`;
}

function body(id) {
  const scout = id === 'scout';
  const p = scout
    ? { dark: '#123c45', mid: '#1b8f8a', light: '#2fcbb9', hi: '#82f5e5', visor: '#f5b942' }
    : { dark: '#293b40', mid: '#a9652d', light: '#e9ac45', hi: '#ffd77a', visor: '#55ead7' };
  const shoulder = scout
    ? 'M48 39 57 35 70 46 79 51 75 59 63 54 53 48Z'
    : 'M39 30 55 23 69 31 75 43 65 53 48 49 37 42Z';
  return `
  <g stroke="${outline}" stroke-width="4">
    <path d="M40 48 54 ${scout ? 39 : 32} 72 ${scout ? 45 : 38} 82 57 82 72 72 ${scout ? 84 : 91} 53 ${scout ? 90 : 99} 38 ${scout ? 82 : 90} 31 65Z" fill="${p.dark}"/>
    <path d="M43 50 56 ${scout ? 44 : 38} 69 ${scout ? 49 : 43} 75 58 75 70 68 ${scout ? 78 : 85} 55 ${scout ? 83 : 91} 43 76 38 65Z" fill="${p.mid}"/>
    <path d="${shoulder}" fill="${p.light}"/>
    <path d="${scout ? 'M53 80 63 74 75 69 80 77 69 82 57 93 48 89Z' : 'M37 86 48 79 65 75 75 85 69 97 55 105 39 98Z'}" fill="${p.light}"/>
    <path d="M51 43 58 42 65 47 60 52M53 83 63 78 69 80 59 88" fill="${p.hi}" stroke="none"/>
    <path d="M37 57H45V73H37Z" fill="#182e36" stroke-width="2"/>
    <path d="M39 60H43V66H39Z" fill="${p.visor}" stroke="none"/>
    <path d="M71 57 79 45 91 48 97 55 90 63 80 64Z" fill="${p.mid}"/>
    <path d="M79 48 88 51 91 55 85 58 77 57Z" fill="${p.light}" stroke-width="2"/>
    <path d="M70 73 79 83 92 80 98 73 91 65 80 65Z" fill="${p.mid}"/>
    <path d="M78 75 85 79 91 76 88 72 80 70Z" fill="${p.light}" stroke-width="2"/>
    <path d="M91 51 103 52 106 58 98 64 90 61Z" fill="#263b42" stroke-width="3"/>
    <path d="M91 67 104 66 106 73 99 78 90 75Z" fill="#263b42" stroke-width="3"/>
    <path d="M98 54H103M98 70H103" stroke="#9db6b3" stroke-width="2"/>
    <path d="M48 64C48 50 55 42 66 42S84 51 84 64 77 86 66 86 48 78 48 64Z" fill="#142f38" stroke-width="5"/>
    <path d="M52 56Q56 47 66 47 76 47 80 55L73 60 61 56 54 64Z" fill="${p.mid}" stroke-width="3"/>
    <path d="M72 49Q82 54 83 64 82 75 72 80L75 68 75 60Z" fill="${p.visor}" stroke-width="3"/>
    <path d="M56 50 61 48 67 50" fill="none" stroke="${p.hi}" stroke-width="2"/>
    <path d="M54 67Q56 76 65 79" fill="none" stroke="#34545b" stroke-width="2"/>
    <path d="M74 57 77 61M74 72 77 68" stroke="#d7f6e8" stroke-width="2"/>
  </g>`;
}

for (const id of ['scout', 'heavy']) {
  asset(`characters/${id}.svg`, `${id} upper body armor`, 128, 128, body(id));
  for (const pose of ['idle', 'a', 'b']) {
    asset(`characters/${id}-legs-${pose}.svg`, `${id} ${pose} leg pose`, 128, 128, legs(id, pose));
  }
}

asset('weapons/rifle.svg', 'RS-7 needle rifle', 128, 64, `
  <g stroke="${outline}" stroke-width="3">
    <path d="M8 25H28V19H37V24H82V20H93V26H120V36H93V40H82V35H47L43 53H31L34 36H8Z" fill="#233940"/>
    <path d="M38 26H85V33H38Z" fill="#506870"/>
    <path d="M45 27H82" stroke="#a3b6b7" stroke-width="2"/>
    <path d="M92 27H119V34H92Z" fill="#172a32"/>
    <path d="M99 29H119" stroke="#39e6d0" stroke-width="2"/>
    <path d="M48 35H62L58 48H48Z" fill="#182e37"/>
    <path d="M19 26H31V34H19Z" fill="#415b63"/>
    <path d="M49 19V13H65L70 20" fill="#152a32"/>
    <path d="M54 16H63" stroke="#82f5e5" stroke-width="2"/>
  </g>
  <path d="M116 26H122V36H116Z" fill="#f5b942" stroke="${outline}" stroke-width="2"/>
  ${rivets([[40, 30], [86, 30]])}
`);

asset('weapons/shotgun.svg', 'SG-4 breaching shotgun', 128, 64, `
  <g stroke="${outline}" stroke-width="3">
    <path d="M7 25H24V18H35V24H72L85 19H110V43H85L72 37H47L43 54H30L33 37H7Z" fill="#303e43"/>
    <path d="M37 25H72V35H37Z" fill="#66777a"/>
    <path d="M47 27H68" stroke="#c0c9bd" stroke-width="2"/>
    <path d="M73 23 85 18H111V29H74ZM74 34H111V44H85L73 39Z" fill="#1d3037"/>
    <path d="M85 21H106M85 37H106" stroke="#8a9a99" stroke-width="2"/>
    <path d="M51 36H65L61 48H51Z" fill="#20373f"/>
    <path d="M12 26H28V36H12Z" fill="#4d6268"/>
  </g>
  <path d="M106 20H114V28H106ZM106 35H114V43H106Z" fill="#d5a747" stroke="${outline}" stroke-width="2"/>
  ${rivets([[39, 30], [73, 30]])}
`);

asset('weapons/launcher.svg', 'GL-2 resonance launcher', 128, 64, `
  <g stroke="${outline}" stroke-width="3">
    <path d="M8 25H26V18H37V22H67L78 13H109L122 23V44L109 53H78L67 42H48L43 56H30L33 41H8Z" fill="#273e45"/>
    <path d="M77 17H108L118 25V40L107 48H77L69 40V25Z" fill="#50666b"/>
    <path d="M82 19H104L111 24H80Z" fill="#8c9f9e" stroke="none"/>
    <path d="M105 17H115L124 25V42L115 51H105L112 40V26Z" fill="#1b3037"/>
    <path d="M115 25H124V42H115Z" fill="#0b1d25"/>
    <path d="M42 23H64V42H42Z" fill="#172d36"/>
    <path d="M46 25H60V39H46Z" fill="#6f653b"/>
    <path d="M49 27V37M55 27V37" stroke="#f5b942" stroke-width="2"/>
    <path d="M49 16V9H65L70 18" fill="#1b3038"/>
    <path d="M54 13H63" stroke="#f5b942" stroke-width="2"/>
  </g>
  ${rivets([[73, 32], [101, 32]])}
`);

function portrait(id) {
  const scout = id === 'scout';
  const p = scout
    ? { dark: '#123c45', mid: '#1b8f8a', light: '#2fcbb9', hi: '#82f5e5', visor: '#f5b942' }
    : { dark: '#293b40', mid: '#a9652d', light: '#e9ac45', hi: '#ffd77a', visor: '#55ead7' };
  return `
  <path d="M24 206 32 151 64 126H128L161 151 170 206Z" fill="#081319" opacity=".6"/>
  <g stroke="${outline}" stroke-width="4">
    <path d="M26 188 32 145 63 126H130L162 145 168 188Z" fill="${p.dark}"/>
    <path d="M33 148 62 131 72 151 60 179 28 184Z" fill="${p.light}"/>
    <path d="M160 148 131 131 120 151 133 179 165 184Z" fill="${p.light}"/>
    <path d="M62 134 79 123H114L132 134 124 188H69Z" fill="${p.mid}"/>
    <path d="M76 142H116L121 176 109 188H84L72 176Z" fill="${p.dark}"/>
    <path d="M82 150H110M80 159H113M84 170H109" stroke="${p.light}" stroke-width="3"/>
    <path d="M56 67 67 30 90 18 119 26 137 51 136 91 119 123 91 134 65 117 53 91Z" fill="${p.dark}" stroke-width="5"/>
    <path d="M64 62 74 37 92 28 114 34 128 53 125 70H64Z" fill="${p.light}"/>
    <path d="M62 70 75 57H119L132 70 125 100 112 115H81L65 100Z" fill="#102b35"/>
    <path d="M67 73 80 64H115L126 73 119 87H77Z" fill="${p.visor}" stroke-width="3"/>
    <path d="M76 70H108" stroke="${p.hi}" stroke-width="3"/>
    <path d="M75 99H116L110 111H82Z" fill="#34515a" stroke-width="2"/>
    <path d="M69 42 83 31 96 28" fill="none" stroke="${p.hi}" stroke-width="3"/>
    <path d="M39 151 56 141M136 141 153 151" stroke="${p.hi}" stroke-width="3"/>
  </g>
  <path d="M33 187H161" stroke="${p.light}" stroke-width="2" opacity=".45"/>`;
}

for (const id of ['scout', 'heavy']) {
  asset(`portraits/${id}.svg`, `${id} operative portrait`, 192, 208, portrait(id));
}

function enemy(type, step) {
  if (type === 'swarmer') {
    const shift = step ? 5 : 0;
    const legs = [
      `M48 48 34 ${33 - shift} 24 ${35 - shift}`,
      `M42 58 27 ${48 + shift} 18 ${52 + shift}`,
      `M48 80 34 ${95 + shift} 24 ${93 + shift}`,
      `M42 70 27 ${80 - shift} 18 ${76 - shift}`,
    ].map((d) => `<path d="${d}"/>`).join('');
    return `
  <g fill="none" stroke="${alienOutline}" stroke-width="9">${legs}</g>
  <g fill="none" stroke="#a83247" stroke-width="4">${legs}</g>
  <g stroke="${alienOutline}" stroke-width="4">
    <path d="M38 56 23 51 15 58 26 64 15 70 23 77 38 72Z" fill="#73243a"/>
    <path d="M96 54Q108 48 114 51L108 59 116 64 105 65 98 62ZM105 63 116 64 108 69 114 77Q108 80 96 74L98 66Z" fill="#f05a61"/>
    <path d="M34 64C34 46 47 35 63 36S89 47 94 64C89 81 78 91 63 92S34 82 34 64Z" fill="#a83247" stroke-width="5"/>
    <path d="M43 51Q53 39 66 41L73 51 66 57 51 54 44 65Z" fill="#e94d59" stroke="none"/>
    <path d="M58 44 69 51 73 64 69 77 58 84 62 70 62 58Z" fill="#f06468" stroke-width="3"/>
    <path d="M46 61 55 59M46 68 55 70M62 48 65 53M63 78 66 74" stroke="#8b2940" stroke-width="2"/>
    <path d="M79 49Q94 47 102 57V71Q94 81 79 79L85 64Z" fill="#d94352"/>
    <path d="M88 55 96 58M88 73 96 70" stroke="#fa847a" stroke-width="2"/>
    <circle cx="96" cy="58" r="3" fill="#ffc857" stroke-width="2"/>
    <circle cx="96" cy="70" r="3" fill="#ffc857" stroke-width="2"/>
  </g>`;
  }
  if (type === 'skitter') {
    const shift = step ? 5 : 0;
    return `
  <g stroke="${alienOutline}" stroke-width="4">
    <path d="M47 57 31 ${43 - shift} 17 ${40 - shift} 25 ${51 - shift} 39 64Z" fill="#8e2b43"/>
    <path d="M60 53 52 ${32 + shift} 39 ${20 + shift} 44 ${36 + shift} 51 58Z" fill="#b63650"/>
    <path d="M76 53 83 ${33 - shift} 99 ${24 - shift} 91 ${40 - shift} 86 58Z" fill="#d74758"/>
    <path d="M39 64 25 ${77 + shift} 17 ${88 + shift} 31 ${85 + shift} 47 71Z" fill="#8e2b43"/>
    <path d="M51 70 44 ${92 - shift} 39 ${108 - shift} 52 ${96 - shift} 60 75Z" fill="#b63650"/>
    <path d="M86 70 91 ${88 + shift} 99 ${104 + shift} 83 ${95 + shift} 76 75Z" fill="#d74758"/>
    <path d="M35 64 49 51 71 48 88 54 101 64 88 74 71 80 49 77Z" fill="#76273e" stroke-width="5"/>
    <path d="M43 64 54 55 64 54 60 64 64 74 54 73Z" fill="#c73d54" stroke-width="3"/>
    <path d="M65 52 79 52 91 59 86 64 91 69 79 76 65 76 72 64Z" fill="#e74e60" stroke-width="3"/>
    <path d="M56 57 66 61M56 71 66 67M74 55 81 60M74 73 81 68" stroke="#ff7b77" stroke-width="2"/>
    <path d="M87 54 111 58 119 64 111 70 87 74 96 64Z" fill="#f15c65"/>
    <circle cx="108" cy="61" r="2.5" fill="#ffc857" stroke-width="1.5"/>
    <circle cx="108" cy="67" r="2.5" fill="#ffc857" stroke-width="1.5"/>
  </g>`;
  }
  const shift = step ? 4 : 0;
  return `
  <g stroke="${alienOutline}" stroke-width="5">
    <path d="M34 42 20 37 12 45 18 59 36 62 46 53ZM18 69 12 83 20 91 34 86 46 75 36 66Z" fill="#632637"/>
    <path d="M48 37 64 ${22 - shift} 87 ${25 - shift} 99 ${38 - shift} 94 51 73 49 61 56Z" fill="#8d303e"/>
    <path d="M61 72 73 79 94 ${77 + shift} 99 ${90 + shift} 87 ${103 + shift} 64 ${106 + shift} 48 91Z" fill="#8d303e"/>
    <path d="M91 ${30 - shift} 106 ${27 - shift} 116 ${36 - shift} 113 ${48 - shift} 100 54 91 47Z" fill="#bd3e48"/>
    <path d="M91 ${81 + shift} 100 ${74 + shift} 113 ${80 + shift} 116 ${92 + shift} 106 ${101 + shift} 91 ${98 + shift}Z" fill="#bd3e48"/>
    <path d="M24 64 31 43 46 28 64 24 83 33 94 49V79L83 95 64 104 46 100 31 85Z" fill="#732a39" stroke-width="6"/>
    <path d="M40 49 56 35 74 38 85 51V77L74 90 56 93 40 79 34 64Z" fill="#a93442"/>
    <path d="M45 48 58 40 70 42 77 51 68 56 55 52 45 59Z" fill="#df5556" stroke="none"/>
    <path d="M43 78 55 75 68 80 75 75 70 85 57 88 46 83Z" fill="#812c3b" stroke="none"/>
    <path d="M53 55 64 59 70 55 77 64 70 73 64 69 53 73 58 64Z" fill="#c8434b" stroke-width="3"/>
    <path d="M45 62 52 64M75 60 81 55M48 82 53 79M76 78 82 82" stroke="#f0756d" stroke-width="2"/>
    <path d="M82 49 99 45 111 54 116 64 111 74 99 83 82 79 89 64Z" fill="#b63a44"/>
    <path d="M103 52 119 48 116 59 123 64 116 69 119 80 103 76 108 64Z" fill="#e55653"/>
    <circle cx="104" cy="58" r="3" fill="#ffc857" stroke-width="2"/>
    <circle cx="104" cy="70" r="3" fill="#ffc857" stroke-width="2"/>
  </g>`;
}

for (const type of ['swarmer', 'skitter', 'brute']) {
  asset(`enemies/${type}.svg`, `${type} creature`, 128, 128, enemy(type, false));
  asset(`enemies/${type}-step.svg`, `${type} alternate walking pose`, 128, 128, enemy(type, true));
}

asset('weapons/arc.svg', 'ARC-5 chain projector with forked emitter', 128, 64, `
  <g stroke="${outline}" stroke-width="3">
    <path d="M8 26H26V19H38V24H74L84 20H96V44H84L74 40H47L43 55H30L33 40H8Z" fill="#223c46"/>
    <path d="M39 26H82V38H39Z" fill="#49656e"/>
    <path d="M45 27H76" stroke="#a3b6b7" stroke-width="2"/>
    <path d="M82 24 102 20 112 10H124V21L114 30 88 33Z" fill="#375760"/>
    <path d="M82 40 102 44 112 54H124V43L114 34 88 31Z" fill="#375760"/>
    <path d="M105 20 114 13H121M105 44 114 51H121" fill="none" stroke="#82f5e5" stroke-width="3"/>
    <path d="M17 27H31V37H17Z" fill="#152d36"/>
    <path d="M48 39H62L58 49H48Z" fill="#182e37"/>
  </g>
  <g fill="#39e6d0" stroke="#10252d" stroke-width="2">
    <path d="M48 23H55V41H48ZM59 23H66V41H59ZM70 23H77V41H70Z"/>
  </g>
  <path d="M51 27V36M62 27V36M73 27V36" stroke="#d7fff7" stroke-width="2"/>
  <path d="M120 25 125 29M120 39 125 35" stroke="#f2fff9" stroke-width="3"/>
  ${rivets([[40, 32], [87, 32]])}
`);

asset('weapons/rail.svg', 'Rail Lance with extended accelerator rails', 128, 64, `
  <g stroke="${outline}" stroke-width="3">
    <path d="M6 28H26V21H38V25H61L72 19H87V24H126V32H87V37H72L61 34H47L43 54H30L33 35H6Z" fill="#263b46"/>
    <path d="M39 26H77V33H39Z" fill="#607983"/>
    <path d="M49 20 62 13H108L119 20Z" fill="#172d38"/>
    <path d="M62 16H108" stroke="#82f5e5" stroke-width="2"/>
    <path d="M84 25H126V31H84Z" fill="#0e222c"/>
    <path d="M88 27H125" stroke="#d7fff7" stroke-width="2"/>
    <path d="M47 34H60L57 47H47Z" fill="#182e37"/>
    <path d="M13 28H29V35H13Z" fill="#4c626c"/>
  </g>
  <g fill="#314e5a" stroke="${outline}" stroke-width="2">
    <path d="M88 20H94V37H88ZM101 20H107V37H101ZM114 20H120V37H114Z"/>
  </g>
  <path d="M90 23H92M103 23H105M116 23H118" stroke="#f5b942" stroke-width="3"/>
  <path d="M122 25H127V32H122Z" fill="#e8f2ef"/>
  ${rivets([[41, 30], [72, 29]])}
`);

asset('weapons/flame.svg', 'Flame Projector with fuel tank and broad nozzle', 128, 64, `
  <g stroke="${outline}" stroke-width="3">
    <path d="M7 27H25V20H36V24H59L70 19H83V45H70L59 40H47L43 55H30L33 40H7Z" fill="#303e43"/>
    <path d="M39 19 48 13H65L73 21V43L65 49H48L39 42Z" fill="#6f653b"/>
    <path d="M45 20 50 17H62L67 22V41L62 45H50L45 40Z" fill="#a9652d"/>
    <path d="M50 19V43M59 17V45" stroke="#e9ac45" stroke-width="2"/>
    <path d="M71 24H86V40H71Z" fill="#536971"/>
    <path d="M80 22 95 13H115L125 22V42L115 51H95L80 42Z" fill="#52656a"/>
    <path d="M88 24 99 18H113L119 23H96Z" fill="#9aa9a5" stroke="none"/>
    <path d="M115 18H125V46H115L120 37V27Z" fill="#15272e"/>
    <path d="M17 28H31V37H17Z" fill="#4d6268"/>
  </g>
  <path d="M120 24H126V40H120Z" fill="#090f13" stroke="${outline}" stroke-width="2"/>
  <path d="M99 27H108V37H99Z" fill="#f5b942" stroke="#513f22" stroke-width="2"/>
  <path d="M102 29H106V35H102Z" fill="#fff3c4"/>
  ${rivets([[76, 32], [94, 32]])}
`);

asset('weapons/mines.svg', 'MX-8 squat mine layer with rotary canister', 128, 64, `
  <g stroke="${outline}" stroke-width="3">
    <path d="M8 28H26V22H39V26H55L62 17H91L102 24H115V40H102L91 47H62L55 40H47L43 54H30L33 40H8Z" fill="#293d43"/>
    <path d="M57 22 65 14H87L98 23V41L87 50H65L57 42Z" fill="#596b6c"/>
    <path d="M63 22 69 18H84L92 24V39L84 45H69L63 40Z" fill="#283f47"/>
    <path d="M98 25H116V39H98Z" fill="#142831"/>
    <path d="M104 28H116V36H104Z" fill="#7f8f89"/>
    <path d="M15 29H31V37H15Z" fill="#4d6268"/>
    <path d="M45 39H57L54 48H45Z" fill="#1b3037"/>
  </g>
  <g fill="#d5a747" stroke="#392f1d" stroke-width="1.5">
    <path d="M68 21H75V27H68ZM79 21H86V27H79ZM68 36H75V42H68ZM79 36H86V42H79Z"/>
  </g>
  <path d="M65 31H90" stroke="#8da09d" stroke-width="2"/>
  ${rivets([[53, 32], [99, 32]])}
`);

function bruteVariant(rank, step) {
  const elite = rank === 'elite';
  const armor = elite ? '#76663d' : '#553143';
  const edge = elite ? '#d5a747' : '#e1b58e';
  return `
  <g stroke="${alienOutline}" stroke-width="5" stroke-linejoin="round">
    <path d="${elite
      ? 'M39 45 25 22 43 30 49 9 60 30 77 14 80 38ZM39 83 25 106 43 98 49 119 60 98 77 114 80 90Z'
      : 'M31 48 9 27 30 31 28 8 46 25 55 4 66 26 86 7 84 32 106 18 99 47ZM31 80 9 101 30 97 28 120 46 103 55 124 66 102 86 121 84 96 106 110 99 81Z'}" fill="${armor}"/>
    <path d="${elite
      ? 'M30 48 12 37 17 54 7 64 17 74 12 91 31 80 40 64Z'
      : 'M29 43 8 35 15 53 4 64 15 75 8 93 30 85 43 64Z'}" fill="${armor}"/>
  </g>
  ${enemy('brute', step)}
  <g stroke="${alienOutline}" stroke-width="4" stroke-linejoin="round">
    <path d="${elite
      ? 'M94 43 116 35 124 47 118 57 125 64 118 71 124 81 116 93 94 85 103 64Z'
      : 'M90 38 107 20 113 39 126 30 121 51 127 64 121 77 126 98 113 89 107 108 90 90 100 64Z'}" fill="${armor}"/>
    <path d="${elite
      ? 'M102 49 115 44 118 50 110 58 119 64 110 70 118 78 115 84 102 79 109 64Z'
      : 'M101 47 108 35 113 49 120 43 116 56 123 64 116 72 120 85 113 79 108 93 101 81 109 64Z'}" fill="${edge}" stroke-width="2"/>
    <path d="M42 48 54 34 66 38 58 49 68 55 54 58 48 70 39 62Z" fill="${armor}"/>
    <path d="M45 88 55 78 68 82 61 91 70 97 54 96Z" fill="${armor}"/>
  </g>
  <path d="M106 55 115 57M106 73 115 71" stroke="${elite ? '#f5b942' : '#fff3c4'}" stroke-width="3"/>
  <path d="${elite ? 'M47 45 53 40M44 91 51 85' : 'M42 45 51 37M42 83 51 91M54 46 62 41M54 82 62 87'}" stroke="${edge}" stroke-width="3"/>
  `;
}

for (const rank of ['elite', 'alpha']) {
  asset(`enemies/brute-${rank}.svg`, `${rank} Brute armored variant`, 128, 128, bruteVariant(rank, false));
  asset(`enemies/brute-${rank}-step.svg`, `${rank} Brute alternate walking pose`, 128, 128, bruteVariant(rank, true));
}

asset('effects/chain.svg', 'ARC-5 branching chain arc', 192, 48, `
  <path d="M2 24H27L39 9 55 36 72 18 89 29 107 12 124 34 143 20 158 27 190 24M72 18 64 4M143 20 153 43" fill="none" stroke="#071216" stroke-width="10" opacity=".85"/>
  <path d="M2 24H27L39 9 55 36 72 18 89 29 107 12 124 34 143 20 158 27 190 24M72 18 64 4M143 20 153 43" fill="none" stroke="#39e6d0" stroke-width="6"/>
  <path d="M2 24H27L39 9 55 36 72 18 89 29 107 12 124 34 143 20 158 27 190 24M72 18 64 4M143 20 153 43" fill="none" stroke="#f2fff9" stroke-width="2"/>
`);

asset('effects/rail.svg', 'Rail Lance penetrating trajectory', 256, 32, `
  <path d="M2 16H254" stroke="#071216" stroke-width="10" opacity=".8"/>
  <path d="M2 16H254" stroke="#39e6d0" stroke-width="6" opacity=".8"/>
  <path d="M2 16H254" stroke="#f2fff9" stroke-width="2"/>
  <path d="M2 8H181M39 24H254M238 8 254 16 238 24" fill="none" stroke="#82f5e5" stroke-width="2" opacity=".8"/>
`);

asset('effects/flame.svg', 'Flame Projector layered cone', 192, 128, `
  <path d="M2 56 38 43 33 55 79 30 70 49 126 17 112 46 177 14 158 46 190 38 176 64 190 90 158 82 177 114 112 82 126 111 70 79 79 98 33 73 38 85 2 72Z" fill="#c84b32" stroke="#30151a" stroke-width="4" opacity=".9"/>
  <path d="M3 59 46 50 40 61 91 42 80 59 143 35 126 58 177 51 160 65 177 81 126 70 143 94 80 69 91 86 40 67 46 78 3 69Z" fill="#f58b3c"/>
  <path d="M3 61 54 56 47 65 105 52 91 65 132 61 116 68 132 75 91 70 105 82 47 70 54 75 3 69Z" fill="#ffd77a"/>
  <path d="M3 63 62 61 52 66 91 64 78 68 52 70 62 72 3 68Z" fill="#fff3c4"/>
`);

asset('effects/mine.svg', 'MX-8 armed octagonal pressure mine', 64, 64, `
  <ellipse cx="32" cy="38" rx="28" ry="21" fill="#02090d" opacity=".55"/>
  <path d="M11 21 22 12H42L53 21 59 32 53 43 42 52H22L11 43 5 32Z" fill="#263b42" stroke="${outline}" stroke-width="4"/>
  <path d="M17 23 25 17H39L47 23 52 32 47 41 39 47H25L17 41 12 32Z" fill="#52656a" stroke="#14262d" stroke-width="2"/>
  <path d="M23 24H41L46 32 41 40H23L18 32Z" fill="#172c34" stroke="${outline}" stroke-width="2"/>
  <path d="M27 27H37L41 32 37 37H27L23 32Z" fill="#d5a747"/>
  <path d="M9 24 3 19M55 24 61 19M9 40 3 45M55 40 61 45" stroke="#718387" stroke-width="5"/>
  <path d="M31 12V7M23 48 20 54M41 48 44 54" stroke="#f5b942" stroke-width="3"/>
`);

asset('effects/coolant.svg', 'Cryo coolant cell with vertical luminous core', 64, 64, `
  <ellipse cx="32" cy="51" rx="22" ry="9" fill="#02090d" opacity=".5"/>
  <path d="M9 19H17V45H9L5 40V24ZM55 19H47V45H55L59 40V24Z" fill="#3c5963" stroke="${outline}" stroke-width="3"/>
  <path d="M23 5H41L49 15V49L41 59H23L15 49V15Z" fill="#29454d" stroke="${outline}" stroke-width="4"/>
  <path d="M25 12H39L43 18V46L38 52H26L21 46V18Z" fill="#123c45" stroke="#668088" stroke-width="2"/>
  <path d="M28 15H36V49H28Z" fill="#39e6d0"/>
  <path d="M32 21V43M23 26 41 38M41 26 23 38" stroke="#d7fff7" stroke-width="3"/>
  <path d="M24 7H40M24 57H40" stroke="#a3b6b7" stroke-width="3"/>
`);

asset('effects/fuse.svg', 'Facility fuse with four prongs and amber bridge', 64, 64, `
  <ellipse cx="32" cy="48" rx="27" ry="10" fill="#02090d" opacity=".5"/>
  <path d="M5 12H17V24H5ZM5 40H17V52H5ZM47 12H59V24H47ZM47 40H59V52H47Z" fill="#8a9a99" stroke="${outline}" stroke-width="3"/>
  <path d="M15 17H49L55 25V39L49 47H15L9 39V25Z" fill="#354c55" stroke="${outline}" stroke-width="4"/>
  <path d="M19 22H45V42H19Z" fill="#6f653b" stroke="#172831" stroke-width="2"/>
  <path d="M23 24H41V40H23Z" fill="#f5b942"/>
  <path d="M26 26H38V31H26Z" fill="#fff3c4"/>
  <path d="M14 29H21M43 29H50M14 35H21M43 35H50" stroke="#a3b6b7" stroke-width="3"/>
`);

asset('environment/decal-medbay.svg', 'Medbay sterile cross and lane decal', 256, 128, `
  <g fill="#82f5e5" opacity=".13">
    <path d="M28 28H48V48H68V68H48V88H28V68H8V48H28Z"/>
    <path d="M99 29H105V87H99ZM119 29H125V87H119ZM139 29H193V35H139ZM139 81H193V87H139Z"/>
  </g>
  <path d="M207 40H239M207 58H231M207 76H239" stroke="#a3b6b7" stroke-width="5" opacity=".1"/>
`);

asset('environment/decal-reactor.svg', 'Reactor segmented containment ring decal', 256, 128, `
  <g fill="none" stroke="#f5b942" opacity=".14">
    <path d="M41 92A54 54 0 0 1 41 36M63 22A54 54 0 0 1 119 22M141 36A54 54 0 0 1 141 92M119 106A54 54 0 0 1 63 106" stroke-width="10"/>
    <path d="M68 64H114M91 41V87" stroke-width="4"/>
  </g>
  <path d="M166 38H236M166 64H216M166 90H236" stroke="#d5a747" stroke-width="6" opacity=".1"/>
`);

asset('environment/decal-hive.svg', 'Hive organic growth and chevron decal', 256, 128, `
  <g fill="none" stroke="#a83247" opacity=".2">
    <path d="M8 103Q29 63 62 78T111 57T153 25M31 111Q50 87 73 96T116 79T163 53" stroke-width="9"/>
    <path d="M63 76 50 55M111 57 104 35M74 96 63 116M117 79 128 102" stroke-width="5"/>
  </g>
  <path d="M174 39 194 64 174 89M202 39 222 64 202 89M230 39 250 64 230 89" fill="none" stroke="#d75a66" stroke-width="7" opacity=".13"/>
`);

for (const [path, content] of files) {
  const destination = resolve(root, 'public/assets', path);
  await mkdir(resolve(destination, '..'), { recursive: true });
  await writeFile(destination, content, 'utf8');
}
console.log(`Generated ${files.size} original SVG assets.`);
