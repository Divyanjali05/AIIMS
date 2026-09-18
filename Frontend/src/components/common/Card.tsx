import React from 'react';
import { Surface, SurfaceProps } from './Surface';

export interface CardProps extends SurfaceProps {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, style, ...props }) => {
  return (
    <Surface
      variant="bordered"
      radius="lg"
      padding="md"
      style={style}
      {...props}
    >
      {children}
    </Surface>
  );
};
