import JSZip from 'jszip';

import indexHtml from '../../../../index.html?raw';
import packageJson from '../../../../package.json?raw';
import readme from '../../../../README.md?raw';
import tsconfig from '../../../../tsconfig.json?raw';
import viteConfig from '../../../../vite.config.ts?raw';

const sourceFiles = import.meta.glob('/src/**/*', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const rootFiles: Record<string, string> = {
  'index.html': indexHtml,
  'package.json': packageJson,
  'README.md': readme,
  'tsconfig.json': tsconfig,
  'vite.config.ts': viteConfig,
};

export async function downloadProjectZip(): Promise<void> {
  const zip = new JSZip();

  Object.entries(rootFiles).forEach(([path, contents]) => zip.file(path, contents));
  Object.entries(sourceFiles).forEach(([path, contents]) => {
    zip.file(path.replace(/^\//, ''), contents);
  });

  const archive = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(archive);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'RC_Structural_Design_Load_Prep.zip';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
