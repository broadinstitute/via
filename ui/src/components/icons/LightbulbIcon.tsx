import { baseIconProps, type IconProps } from "./Icon";

export default function LightbulbIcon(props: IconProps) {
  return (
    <svg {...baseIconProps(props)}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.5.4.9 1 .9 1.7v.6h6.2v-.6c0-.7.4-1.3.9-1.7A7 7 0 0 0 12 2Z" />
    </svg>
  );
}
