import {
  Mail,
  Phone,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
} from "lucide-react";

export const FooterPreview = ({ data }) => {
  if (!data) return null;

  const currentYear = new Date().getFullYear();
  const copyrightText = data.copyrightText?.replace("{year}", currentYear);

  return (
    <div className="space-y-6 bg-gradient-to-br from-muted/30 to-background p-8 rounded-xl border border-border">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Footer Preview
        </h3>
        <p className="text-sm text-muted-foreground">
          Live preview of your footer
        </p>
      </div>

      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Brand Section */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              Brand
            </h4>
            {data.logo?.url && (
              <img
                src={data.logo.url}
                alt="Logo"
                className="h-8 mb-3 object-contain"
              />
            )}
            <div className="font-bold text-foreground mb-2">
              {data.siteName}
            </div>
            <p className="text-sm text-muted-foreground">
              {data.footerDescription}
            </p>
          </div>

          {/* Contact Section */}
          {/* Contact Section */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              Contact
            </h4>
            <div className="space-y-2 text-sm">
              {data.email?.support && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {data.email.support}
                </div>
              )}
              {data.telegram?.support && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                  {data.telegram.support}
                </div>
              )}
            </div>
          </div>

          {/* Social Media Section */}
          {/* Social Media Section */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              Follow Us
            </h4>
            <div className="flex gap-3 flex-wrap">
              {data.socialMedia?.instagram && (
                <a
                  href={data.socialMedia.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {data.socialMedia?.twitter && (
                <a
                  href={data.socialMedia.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
                  title="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {data.socialMedia?.facebook && (
                <a
                  href={data.socialMedia.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
                  title="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {data.socialMedia?.linkedin && (
                <a
                  href={data.socialMedia.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
                  title="LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
              {data.socialMedia?.youtube && (
                <a
                  href={data.socialMedia.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
                  title="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
              {data.socialMedia?.telegram && (
                <a
                  href={data.socialMedia.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
                  title="Telegram"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">{copyrightText}</p>
        </div>
      </div>
    </div>
  );
};
