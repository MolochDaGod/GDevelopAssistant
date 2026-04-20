/**
 * BabyGrudge — Babylon.js hub.
 *
 * The rest of the launcher is three.js / PixiJS / Phaser / Canvas2D. Babylon
 * is heavier and only used for a specific subset of 3D showcase pieces — this
 * hub keeps them in one place so the primary stack stays clean.
 *
 * Contents:
 *   1. Built-in pages that run Babylon (shooter-3d, grudge web engine)
 *   2. External Babylon projects we own on GitHub / deployed on Vercel / CF
 *   3. Links to reference playgrounds and docs so the team has one landing page
 *      for all things Babylon.
 */

import { Link, useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Cog,
  ExternalLink,
  Crosshair,
  Boxes,
  Github,
  Play,
  BookOpen,
  Sparkles,
  Rocket,
} from 'lucide-react';

type ItemKind = 'internal' | 'external' | 'docs';

interface BabyItem {
  id: string;
  title: string;
  description: string;
  kind: ItemKind;
  href: string;
  tags: string[];
  badge?: string;
  cta?: string;
}

/**
 * Internal routes — pages inside this launcher that actually import `@babylonjs/*`
 * at runtime. Tracked explicitly so the rest of the launcher can stay three.js-only.
 */
const INTERNAL: BabyItem[] = [
  {
    id: 'grudge-web-engine',
    title: 'Grudge Web Engine',
    description:
      'The in-app Babylon runtime: scene authoring, GLTF/GLB loading, shader sandbox, Havok physics toggle. Entry point for internal Babylon demos.',
    kind: 'internal',
    href: '/engine',
    tags: ['runtime', 'havok', 'gltf'],
    badge: 'Babylon',
    cta: 'Open engine',
  },
  {
    id: 'shooter-3d',
    title: 'Grudge Assault (Shooter 3D)',
    description:
      'Babylon + Rapier wave-based third-person shooter. Armory3D-style trait system, multiple weapons, over-the-shoulder camera.',
    kind: 'internal',
    href: '/shooter-3d',
    tags: ['tps', 'rapier', 'arena'],
    badge: 'Babylon',
    cta: 'Play',
  },
];

/**
 * External Babylon projects owned by the studio. These live in sibling repos /
 * deployments, not in this launcher. Linked here so players + staff have one
 * discovery surface.
 */
const EXTERNAL: BabyItem[] = [
  {
    id: 'grudge-engine-web',
    title: 'Grudge Engine Web',
    description:
      'Standalone Babylon engine deployment with MMO zone demos, character customisation, and multiplayer prototyping.',
    kind: 'external',
    href: 'https://grudge-engine-web-grudgenexus.vercel.app/',
    tags: ['mmo', 'multiplayer', 'zones'],
    badge: 'Vercel',
    cta: 'Open deployment',
  },
  {
    id: 'grudgebabylon',
    title: 'GrudgeBabylon',
    description:
      'Unity-to-Babylon port scaffolding. Reference project for replicating the Grudge Warlords Unity gameplay inside a Babylon runtime.',
    kind: 'external',
    href: 'https://github.com/MolochDaGod/GrudgeBabylon',
    tags: ['port', 'unity-parity', 'reference'],
    badge: 'GitHub',
    cta: 'View on GitHub',
  },
  {
    id: 'babylon-ai-workers',
    title: 'Babylon AI Workers',
    description:
      'Cloudflare Workers + Babylon + AI agents. Hosts RAG content, physics helpers, and knowledge-base lookups against the Babylon scene graph.',
    kind: 'external',
    href: 'https://ai.grudge-studio.com/',
    tags: ['workers', 'ai', 'rag'],
    badge: 'CF Worker',
    cta: 'Open AI hub',
  },
  {
    id: 'babylon-docs-bucket',
    title: 'Babylon Docs Mirror',
    description:
      'R2 bucket babylon-docs. Snapshot of Babylon.js API reference + guides, served from the Grudge CDN so agents can grep it without hitting upstream.',
    kind: 'external',
    href: 'https://assets.grudge-studio.com/babylon-docs/',
    tags: ['docs', 'r2', 'offline'],
    badge: 'R2',
    cta: 'Browse mirror',
  },
];

/**
 * Upstream references we lean on. Playground is intentionally first — it's the
 * fastest way to prototype a Babylon scene without spinning up a worker.
 */
const REFERENCES: BabyItem[] = [
  {
    id: 'playground',
    title: 'Babylon Playground',
    description: 'Live Babylon scene editor. Prototype a scene and copy it into Grudge Web Engine when it works.',
    kind: 'docs',
    href: 'https://playground.babylonjs.com/',
    tags: ['playground'],
    cta: 'Open playground',
  },
  {
    id: 'docs',
    title: 'Babylon.js Documentation',
    description: 'Official docs — APIs, tutorials, features.',
    kind: 'docs',
    href: 'https://doc.babylonjs.com/',
    tags: ['api', 'tutorials'],
    cta: 'Open docs',
  },
  {
    id: 'forum',
    title: 'Babylon Forum',
    description: 'Community Q&A. Usually faster than GitHub issues for runtime quirks.',
    kind: 'docs',
    href: 'https://forum.babylonjs.com/',
    tags: ['community'],
    cta: 'Open forum',
  },
];

function ItemCard({ item }: { item: BabyItem }) {
  const [, navigate] = useLocation();
  const onClick = () => {
    if (item.kind === 'internal') {
      navigate(item.href);
    } else {
      window.open(item.href, '_blank', 'noopener,noreferrer');
    }
  };
  const Icon =
    item.kind === 'internal' ? (item.id === 'shooter-3d' ? Crosshair : Cog)
    : item.kind === 'external' ? (item.badge === 'GitHub' ? Github : Rocket)
    : BookOpen;
  return (
    <Card
      className="group cursor-pointer transition-all hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10"
      onClick={onClick}
      data-testid={`baby-card-${item.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-red-400" />
            <CardTitle className="text-base">{item.title}</CardTitle>
          </div>
          {item.badge && (
            <Badge variant="secondary" className="bg-red-500/15 text-red-300 border-0 text-[10px]">
              {item.badge}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
        <div className="flex flex-wrap gap-1">
          {item.tags.map((t) => (
            <span
              key={t}
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="pt-1 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/70 font-mono truncate max-w-[60%]">
            {item.href.replace(/^https?:\/\//, '')}
          </span>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
            {item.cta || (item.kind === 'internal' ? 'Open' : 'Visit')}
            {item.kind === 'internal' ? <Play className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  icon: Icon,
  subtitle,
  items,
}: {
  title: string;
  icon: typeof Cog;
  subtitle: string;
  items: BabyItem[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-red-400" />
        <h2 className="text-sm font-semibold tracking-wide uppercase">{title}</h2>
        <span className="text-[11px] text-muted-foreground ml-1">{subtitle}</span>
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function BabyGrudge() {
  return (
    <div className="px-5 py-6 max-w-6xl mx-auto space-y-8" data-testid="page-babygrudge">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Boxes className="h-6 w-6 text-red-400" />
          <h1 className="text-2xl font-bold tracking-tight">BabyGrudge</h1>
          <Badge variant="secondary" className="bg-red-500/15 text-red-300 border-0 text-[10px]">
            Babylon.js
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          Everything Babylon.js in one place — runtime, demos, external projects, docs. The rest of
          the launcher runs on three.js / PixiJS / Phaser / Canvas2D; Babylon lives here so the
          primary stack stays lightweight.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/three-engine">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
              <Cog className="h-3 w-3" />
              Prefer three.js?
            </Button>
          </Link>
          <Link href="/flat-engine">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              Or 2D flat engine
            </Button>
          </Link>
        </div>
      </header>

      <Section
        title="In-launcher"
        subtitle="routes inside this app that import @babylonjs/*"
        icon={Cog}
        items={INTERNAL}
      />

      <Section
        title="External projects"
        subtitle="sibling repos and deployments we own"
        icon={Rocket}
        items={EXTERNAL}
      />

      <Section
        title="References"
        subtitle="upstream docs, playground, forum"
        icon={BookOpen}
        items={REFERENCES}
      />

      <footer className="text-[11px] text-muted-foreground pt-4 border-t border-white/5">
        Add a project here by editing <code className="font-mono">client/src/pages/babygrudge.tsx</code> —
        keep Babylon imports out of the other pages so the launcher bundle stays small.
      </footer>
    </div>
  );
}
