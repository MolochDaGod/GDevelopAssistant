declare namespace JSX {
  interface IntrinsicElements {
    'needle-engine': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        'background-color'?: string;
        'loading-style'?: 'light' | 'dark';
        'keep-alive'?: boolean;
        autoplay?: boolean;
        'auto-rotate'?: boolean;
        'camera-controls'?: boolean;
        'environment'?: string;
      },
      HTMLElement
    >;
  }
}
