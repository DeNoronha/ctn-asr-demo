import type React from 'react';
import { Button, Modal, Group } from '@mantine/core';


interface HelpPanelProps {
  title: string;
  content: React.ReactNode;
  visible: boolean;
  onClose: () => void;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ title, content, visible, onClose }) => {
  return (
    <Modal opened={visible} onClose={onClose} title={title} size="md">
      <div className="help-panel-content">{content}</div>
      <Group mt="xl" justify="flex-end">
        <Button onClick={onClose} color="blue">
          Close
        </Button>
      </Group>
    </Modal>
  );
};
