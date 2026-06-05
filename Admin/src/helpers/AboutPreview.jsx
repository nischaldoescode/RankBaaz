/**
 * builds the admin about preview helper view used for content previews and modal workflows
 *
 * @file admin/src/helpers/aboutpreview.jsx
 * @module admin/src/helpers/aboutpreview
 * @exports module members used by the related app runtime
 */

import {
  Brain,
  Target,
  Trophy,
  Zap,
  Lightbulb,
  Rocket,
  BookOpen,
  TrendingUp,
  Shield,
  Award,
  Users,
  Heart,
} from "lucide-react";

const iconMap = {
  Brain,
  Target,
  Trophy,
  Zap,
  Lightbulb,
  Rocket,
  BookOpen,
  TrendingUp,
  Shield,
  Award,
  Users,
  Heart,
};

export const AboutPreview = ({ data }) => {
  if (!data) return null;

  return (
    <div className="space-y-8 bg-gradient-to-br from-muted/30 to-background p-8 rounded-xl border border-border">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">
          About Page Preview
        </h3>
        <p className="text-sm text-muted-foreground">
          Live preview of your about page
        </p>
      </div>

      {/* header preview */}
      <div className="bg-card rounded-xl p-8 border border-border">
        <h4 className="text-sm font-semibold text-muted-foreground mb-6 uppercase">
          Page Header
        </h4>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_260px] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {data.hero?.eyebrow || `About ${data.siteName}`}
            </p>
            <h1 className="mt-2 text-4xl md:text-5xl font-bold text-foreground mb-4">
              {data.hero?.title || `About ${data.siteName}`}
            </h1>
            <p className="text-lg text-muted-foreground">
              {data.hero?.description || data.siteDescription}
            </p>
          </div>
          {(data.hero?.image?.url || data.hero?.image?.fallbackSrc) && (
            <img
              src={data.hero.image.url || data.hero.image.fallbackSrc}
              alt={data.hero.image.alt || "About page image"}
              className="h-44 w-full rounded-xl object-cover"
            />
          )}
        </div>
      </div>

      {/* stats preview */}
      {data.stats && data.stats.length > 0 && (
        <div className="bg-card rounded-xl p-6 border border-border">
          <h4 className="text-sm font-semibold text-muted-foreground mb-6 uppercase text-center">
            Stats Section ({data.stats.length} stats)
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {data.stats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-muted/30 rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* values preview */}
      {data.values && data.values.length > 0 && (
        <div className="bg-card rounded-xl p-6 border border-border">
          <h4 className="text-sm font-semibold text-muted-foreground mb-6 uppercase text-center">
            Core Values ({data.values.length} values)
          </h4>
          {data.valuesMeta && (
            <div className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {data.valuesMeta.eyebrow}
              </p>
              <h5 className="mt-2 text-2xl font-bold text-foreground">
                {data.valuesMeta.title}
              </h5>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.values.map((value, idx) => {
              const IconComponent = iconMap[value.icon] || Target;
              return (
                <div
                  key={idx}
                  className="bg-muted/30 rounded-2xl p-8 hover:shadow-xl transition-shadow"
                >
                  <div
                    className={`w-14 h-14 ${value.bgColor} rounded-xl flex items-center justify-center mb-6`}
                  >
                    <IconComponent className={`w-7 h-7 ${value.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* features preview */}
      {data.features && data.features.length > 0 && (
        <div className="bg-card rounded-xl p-6 border border-border">
          <h4 className="text-sm font-semibold text-muted-foreground mb-6 uppercase text-center">
            Platform Features ({data.features.length} features)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.features.map((feature, idx) => {
              const IconComponent = iconMap[feature.icon] || BookOpen;
              return (
                <div
                  key={idx}
                  className="bg-muted/30 rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105"
                >
                  <IconComponent className="w-8 h-8 text-primary mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.cta && (
        <div className="rounded-xl border border-border bg-primary/10 p-6">
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">
            CTA Section
          </h4>
          <h5 className="text-2xl font-bold text-foreground">
            {data.cta.title}
          </h5>
          <p className="mt-2 text-muted-foreground">{data.cta.description}</p>
        </div>
      )}
    </div>
  );
};
