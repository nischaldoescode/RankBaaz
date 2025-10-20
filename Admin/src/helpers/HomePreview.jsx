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

export const HomePreview = ({ data }) => {
  if (!data) return null;

  return (
    <div className="space-y-8 bg-gradient-to-br from-muted/30 to-background p-8 rounded-xl border border-border">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Home Page Preview
        </h3>
        <p className="text-sm text-muted-foreground">
          Live preview of your home page
        </p>
      </div>

      {/* Hero Section Preview */}
      <div className="bg-card rounded-xl p-8 border border-border text-center">
        <h4 className="text-sm font-semibold text-muted-foreground mb-6 uppercase">
          Hero Section
        </h4>
        {data.logo?.url && (
          <img
            src={data.logo.url}
            alt="Logo"
            className="h-16 mb-6 object-contain mx-auto"
          />
        )}
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          {data.hero?.title}{" "}
          <span className="text-primary block mt-2">
            {data.hero?.highlight}
          </span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          {data.hero?.description}
        </p>
      </div>

      {/* Stats Section Preview */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h4 className="text-sm font-semibold text-muted-foreground mb-6 uppercase">
          Stats Section ({data.stats?.length || 0} stats)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {data.stats?.map((stat, idx) => {
            const IconComponent = iconMap[stat.icon] || Users;
            return (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 bg-primary/30 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart Config Preview */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">
          Chart Configuration
        </h4>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="px-4 py-2 bg-muted rounded-lg">
            <span className="text-xs text-muted-foreground">Type:</span>
            <span className="ml-2 font-semibold capitalize">
              {data.chartConfig?.type || "pie"}
            </span>
          </div>
          <div className="px-4 py-2 bg-muted rounded-lg">
            <span className="text-xs text-muted-foreground">Position:</span>
            <span className="ml-2 font-semibold capitalize">
              {data.chartConfig?.position || "right"}
            </span>
          </div>
          <div className="px-4 py-2 bg-muted rounded-lg">
            <span className="text-xs text-muted-foreground">Enabled:</span>
            <span className="ml-2 font-semibold">
              {data.chartConfig?.enabled ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>

      {/* Features Preview */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h4 className="text-sm font-semibold text-muted-foreground mb-6 uppercase text-center">
          Features Section
        </h4>
        <div className="text-center mb-6">
          <h5 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {data.featuresTitle}
          </h5>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            {data.featuresDescription}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.features?.map((feature, idx) => {
            const IconComponent = iconMap[feature.icon] || Brain;
            return (
              <div key={idx} className="bg-muted/30 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-primary/15 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <IconComponent className="w-8 h-8 text-primary" />
                </div>
                <h6 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h6>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQs Preview */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">
          FAQs Section ({data.faqs?.length || 0} questions shown on home)
        </h4>
        <div className="space-y-4">
          {data.faqs?.slice(0, 5).map((faq, idx) => (
            <div
              key={idx}
              className="p-4 bg-muted/30 rounded-lg border border-border"
            >
              <div className="font-semibold text-foreground mb-2">
                {faq.question}
              </div>
              <p className="text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
          {data.faqs?.length > 5 && (
            <p className="text-sm text-muted-foreground text-center">
              ...and {data.faqs.length - 5} more questions
            </p>
          )}
        </div>
      </div>

      {/* CTA Preview */}
      <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-xl p-8 border border-border text-center">
        <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">
          CTA Section
        </h4>
        <h5 className="text-3xl font-bold text-foreground mb-4">
          {data.cta?.title}
        </h5>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {data.cta?.description}
        </p>
      </div>
    </div>
  );
};