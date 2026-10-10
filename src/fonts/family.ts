export function fontFamily(name: string) {
  return (
    (
      {
        system: '"Segoe UI",system-ui,sans-serif',
        mono: '"Cascadia Code",Consolas,monospace',
        serif: 'Georgia,serif',
        rounded: '"Arial Rounded MT Bold","Trebuchet MS",sans-serif',
        condensed: 'Impact,"Arial Narrow",sans-serif',
        display: '"Century Gothic",Futura,"Trebuchet MS",sans-serif',
      } as Record<string, string>
    )[name] ?? 'system-ui,sans-serif'
  );
}
