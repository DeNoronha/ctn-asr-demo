import type React from 'react';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import { Button } from '@progress/kendo-react-buttons';

interface HelpPanelProps {
  title: string;
  content: React.ReactNode;
  visible: boolean;
  onClose: () => void;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ title, content, visible, onClose }) => {
  if (!visible) {
    return null;
  }

  return (
    <Dialog title={title} onClose={onClose} width={500}>
      <div className="help-panel-content">{content}</div>
      <DialogActionsBar>
        <Button onClick={onClose} themeColor="primary">
          Close
        </Button>
      </DialogActionsBar>
    </Dialog>
  );
};
