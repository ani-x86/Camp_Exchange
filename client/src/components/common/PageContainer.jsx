/**
 * PageContainer — shared responsive container for CampX pages.
 *
 * Enforces unified x-axis alignment:
 *   - Logo, hero text, section headers, and first card align on the left.
 *   - Header icons, hero image, and 4th card align on the right.
 *
 * Viewport rules (design.md & alignment spec):
 *   - >= 1280px (xl): max-w-[1280px], px-8
 *   - 768px - 1279px (md/lg): px-6
 *   - < 768px: px-4
 */

export const PAGE_CONTAINER_CLASS = 'mx-auto w-full max-w-[1280px] px-4 md:px-6 xl:px-8';

export default function PageContainer({ children, className = '', as: Component = 'div', ...props }) {
  return (
    <Component className={`${PAGE_CONTAINER_CLASS} ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}
