// Legal Page Preview Component
export const LegalPagePreview = ({ title, sections, metadata, content }) => {
  // If no sections but has old content (markdown), show that
  if ((!sections || sections.length === 0) && content) {
    return (
      <div className="space-y-6 bg-gradient-to-br from-muted/30 to-background p-8 rounded-xl border border-border">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-foreground mb-2">
            {title || "Legal Page"} Preview
          </h3>
          <p className="text-sm text-muted-foreground">
            Legacy content (Markdown format)
          </p>
          <p className="text-xs text-yellow-600 bg-yellow-50 inline-block px-3 py-1 rounded mt-2">
            ⚠️ This is old format. Edit in Legal Pages tab to use new structure.
          </p>
        </div>

        {/* Metadata Display */}
        {metadata && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex gap-6 text-sm flex-wrap">
              {metadata.effectiveDate && (
                <div>
                  <span className="text-muted-foreground">Effective: </span>
                  <span className="font-medium">
                    {new Date(metadata.effectiveDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {metadata.lastReviewedDate && (
                <div>
                  <span className="text-muted-foreground">Last Reviewed: </span>
                  <span className="font-medium">
                    {new Date(metadata.lastReviewedDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Old Content Display */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">
            {content}
          </pre>
        </div>
      </div>
    );
  }

  // Show message if no sections AND no content
  if (!sections || sections.length === 0) {
    return (
      <div className="space-y-6 bg-gradient-to-br from-muted/30 to-background p-8 rounded-xl border border-border">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-foreground mb-2">
            {title || "Legal Page"} Preview
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            No sections added yet
          </p>
          <p className="text-xs text-gray-500">
            Go to the Legal Pages tab to add sections to this page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-gradient-to-br from-muted/30 to-background p-8 rounded-xl border border-border">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">
          {title} Preview
        </h3>
        <p className="text-sm text-muted-foreground">
          Live preview of your legal page
        </p>
      </div>

      {/* Metadata Display */}
      {metadata && (
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex gap-6 text-sm flex-wrap">
            {metadata.effectiveDate && (
              <div>
                <span className="text-muted-foreground">Effective: </span>
                <span className="font-medium">
                  {new Date(metadata.effectiveDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {metadata.lastReviewedDate && (
              <div>
                <span className="text-muted-foreground">Last Reviewed: </span>
                <span className="font-medium">
                  {new Date(metadata.lastReviewedDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="bg-card rounded-xl p-6 border border-border space-y-6">
        {sections
          .sort((a, b) => a.order - b.order)
          .map((section, idx) => (
            <div key={idx} className="space-y-3">
              {/* Section Header */}
              <h4 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                {section.header}
              </h4>

              {/* Section Content */}
              {section.content && section.content.trim() !== "" && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </p>
              )}

              {/* Subheaders */}
              {section.subheaders &&
                section.subheaders.length > 0 &&
                section.subheaders
                  .sort((a, b) => a.order - b.order)
                  .map((sub, subIdx) => (
                    <div key={subIdx} className="ml-4 space-y-2">
                      {/* Subheader Title */}
                      {sub.title && sub.title.trim() !== "" && (
                        <h5 className="text-md font-medium text-foreground">
                          {sub.title}
                        </h5>
                      )}

                      {/* Bullet Points */}
                      {sub.points && sub.points.length > 0 && (
                        <ul className="list-disc list-inside space-y-1">
                          {sub.points.map((point, pointIdx) => (
                            <li
                              key={pointIdx}
                              className="text-sm text-muted-foreground leading-relaxed"
                            >
                              {point}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
            </div>
          ))}
      </div>
    </div>
  );
};
