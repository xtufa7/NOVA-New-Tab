import { loadSettings, storageWarning } from '../storage/settings';
import { renderAppearance } from '../newtab/appearance';
import { openControlCenter } from './control';
import { report } from '../shared/dom';
void loadSettings()
  .then(async () => {
    await renderAppearance();
    openControlCenter('Appearance', true);
    if (storageWarning) report(storageWarning);
  })
  .catch(report);
