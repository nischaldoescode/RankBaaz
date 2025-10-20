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
  Mail,
  Phone,
  Clock,
  MapPin,
  Linkedin,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
} from "lucide-react";

export const ContactPreview = ({ data }) => {
  if (!data) return null;

  const hasAddress =
    data.address?.street ||
    data.address?.city ||
    data.address?.state ||
    data.address?.zipCode ||
    data.address?.country;

  return (
    <div className="space-y-6 bg-gradient-to-br from-muted/30 to-background p-8 rounded-xl border border-border">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Contact Page Preview
        </h3>
        <p className="text-sm text-muted-foreground">
          Live preview of your contact page
        </p>
      </div>

      {/* Contact Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Email Card */}
        {data.email?.support && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Email Us
            </h4>

            <a
              href={`mailto:${data.email.support}`}
              className="text-xs text-muted-foreground hover:text-primary break-all transition-colors"
            >
              {data.email.support}
            </a>
          </div>
        )}

        {/* Telegram Card */}
        {data.telegram?.support && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-3">
              <svg
                className="w-5 h-5 text-blue-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Telegram
            </h4>

            <a
              href={`https://t.me/${data.telegram.support.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {data.telegram.support}
            </a>
          </div>
        )}

        {/* Address Card */}
        {hasAddress && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5 text-orange-500" />
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Visit Us
            </h4>
            <div className="text-xs text-muted-foreground space-y-1">
              {data.address.street && <p>{data.address.street}</p>}
              {(data.address.city || data.address.state) && (
                <p>
                  {data.address.city}
                  {data.address.city && data.address.state && ", "}
                  {data.address.state} {data.address.zipCode}
                </p>
              )}
              {data.address.country && <p>{data.address.country}</p>}
            </div>
          </div>
        )}

        {/* Business Hours */}
        {data.businessHours && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Business Hours
            </h4>
            <p className="text-xs text-muted-foreground">
              {data.businessHours}
            </p>
          </div>
        )}
      </div>

      {/* Social Media */}
      {data.socialMedia &&
        Object.values(data.socialMedia).some((val) => val) && (
          <div className="bg-card rounded-xl p-6 border border-border">
            <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">
              Connect With Us
            </h4>
            <div className="flex gap-3 flex-wrap">
              {data.socialMedia.instagram && (
                <a
                  href={data.socialMedia.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-5 h-5 text-pink-500" />
                </a>
              )}
              {data.socialMedia.twitter && (
                <a
                  href={data.socialMedia.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
                  title="Twitter"
                >
                  <Twitter className="w-5 h-5 text-blue-400" />
                </a>
              )}
              {data.socialMedia.facebook && (
                <a
                  href={data.socialMedia.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
                  title="Facebook"
                >
                  <Facebook className="w-5 h-5 text-blue-600" />
                </a>
              )}
              {data.socialMedia.linkedin && (
                <a
                  href={data.socialMedia.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
                  title="LinkedIn"
                >
                  <Linkedin className="w-5 h-5 text-blue-700" />
                </a>
              )}
              {data.socialMedia.youtube && (
                <a
                  href={data.socialMedia.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
                  title="YouTube"
                >
                  <Youtube className="w-5 h-5 text-red-600" />
                </a>
              )}
              {data.socialMedia.telegram && (
                <a
                  href={data.socialMedia.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
                  title="Telegram"
                >
                  <svg
                    className="w-5 h-5 text-blue-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        )}
    </div>
  );
};
