import Modal from "@/components/ui/Modal";

export const LeaderboardInfoModal = ({ isOpen, onClose, infoData }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How Points Work" size="md">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {/* Base Points */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Base Points</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-muted/50 rounded">
              <div className="font-medium">Completion</div>
              <div className="text-muted-foreground">+10 pts</div>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <div className="font-medium">Per Question</div>
              <div className="text-muted-foreground">+0.2 pts</div>
            </div>
          </div>
        </div>

        {/* Difficulty Multipliers */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Difficulty</h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-green-500/10 rounded text-center">
              <div className="font-medium">Easy</div>
              <div className="text-muted-foreground">x1.0</div>
            </div>
            <div className="p-2 bg-yellow-500/10 rounded text-center">
              <div className="font-medium">Medium</div>
              <div className="text-muted-foreground">x1.5</div>
            </div>
            <div className="p-2 bg-red-500/10 rounded text-center">
              <div className="font-medium">Hard</div>
              <div className="text-muted-foreground">x2.0</div>
            </div>
          </div>
        </div>

        {/* Bonuses & Penalties */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Bonuses & Penalties</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between p-2 bg-primary/10 rounded">
              <span>Score bonus (0-100%)</span>
              <span className="font-mono">+0-50</span>
            </div>
            <div className="flex justify-between p-2 bg-primary/10 rounded">
              <span>Speed bonus</span>
              <span className="font-mono">+0-5</span>
            </div>
            <div className="flex justify-between p-2 bg-destructive/10 rounded">
              <span>Abandon test</span>
              <span className="font-mono">-2 to -7</span>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};