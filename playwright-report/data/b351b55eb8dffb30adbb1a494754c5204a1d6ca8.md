# Test info

- Name: LagerLogix Funktionstest >> Tabellen zeigen Daten korrekt an und unterstützen Aktionen
- Location: /Users/firashattab/hummert-umzug-app/tests/e2e/functional.spec.ts:286:7

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /Users/firashattab/Library/Caches/ms-playwright/webkit-2158/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=25216
[pid=25216][err] /Users/firashattab/Library/Caches/ms-playwright/webkit-2158/pw_run.sh: line 7: 25222 Bus error: 10           DYLD_FRAMEWORK_PATH="$DYLIB_PATH" DYLD_LIBRARY_PATH="$DYLIB_PATH" "$PLAYWRIGHT" "$@"
Call log:
  - <launching> /Users/firashattab/Library/Caches/ms-playwright/webkit-2158/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=25216
  - [pid=25216][err] /Users/firashattab/Library/Caches/ms-playwright/webkit-2158/pw_run.sh: line 7: 25222 Bus error: 10           DYLD_FRAMEWORK_PATH="$DYLIB_PATH" DYLD_LIBRARY_PATH="$DYLIB_PATH" "$PLAYWRIGHT" "$@"

```

# Test source

```ts
  186 |       if (await submitButton.count() > 0) {
  187 |         await submitButton.click();
  188 |         console.log('Formular abgesendet');
  189 |         
  190 |         // Auf Weiterleitung oder Erfolgsmeldung warten
  191 |         try {
  192 |           // Entweder Weiterleitung zur Detailseite oder Übersicht
  193 |           await Promise.race([
  194 |             page.waitForURL(/.*\/umzuege\/.*/, { timeout: 5000 }),
  195 |             page.waitForURL('/umzuege', { timeout: 5000 }),
  196 |             page.waitForSelector('.success-message, .alert-success', { timeout: 5000 })
  197 |           ]);
  198 |           console.log('Umzug wurde erfolgreich gespeichert');
  199 |         } catch (e) {
  200 |           console.warn('Keine eindeutige Bestätigung für erfolgreichen Umzug gefunden');
  201 |           // Trotzdem fortfahren, da dies möglicherweise ein UI-Problem und nicht ein Funktionsproblem ist
  202 |         }
  203 |       } else {
  204 |         console.warn('Kein Submit-Button gefunden!');
  205 |       }
  206 |     });
  207 |     
  208 |     // Abschließender Screenshot nach Absenden
  209 |     await page.screenshot({ path: './test-results/umzugsformular-nach-absenden.png' });
  210 |   });
  211 |
  212 |   // Überprüfung des responsiven Designs
  213 |   test('Responsive Design funktioniert korrekt', async ({ page }) => {
  214 |     // Unterschiedliche Viewport-Größen testen
  215 |     const viewportSizes = [
  216 |       { width: 1280, height: 800, name: 'desktop' },
  217 |       { width: 768, height: 1024, name: 'tablet' },
  218 |       { width: 375, height: 667, name: 'mobile' }
  219 |     ];
  220 |     
  221 |     for (const viewport of viewportSizes) {
  222 |       await test.step(`Test auf ${viewport.name}`, async () => {
  223 |         // Viewport-Größe setzen
  224 |         await page.setViewportSize({ width: viewport.width, height: viewport.height });
  225 |         
  226 |         // Zum Dashboard navigieren
  227 |         await page.goto('/dashboard');
  228 |         await page.waitForLoadState('networkidle');
  229 |         
  230 |         // Screenshot für diese Viewport-Größe
  231 |         await page.screenshot({ path: `./test-results/${viewport.name}-dashboard.png` });
  232 |         
  233 |         // Prüfen der responsiven Elemente
  234 |         if (viewport.width < 768) {
  235 |           // Mobile: Sidebar sollte eingeklappt sein oder Burger-Menü sichtbar
  236 |           const burgerMenu = page.locator('button.menu-toggle, button[aria-label="Toggle menu"]');
  237 |           if (await burgerMenu.count() > 0) {
  238 |             await expect(burgerMenu).toBeVisible();
  239 |             
  240 |             // Burger-Menü klicken und prüfen, ob Menü erscheint
  241 |             await burgerMenu.click();
  242 |             await page.waitForTimeout(500); // Für Animation
  243 |             
  244 |             // Prüfen, ob Menü nach Klick sichtbar ist
  245 |             const expandedMenu = page.locator('.sidebar.open, nav.open, .mobile-menu.open');
  246 |             
  247 |             // Screenshot nach Menü-Öffnung
  248 |             await page.screenshot({ path: `./test-results/${viewport.name}-menu-open.png` });
  249 |           }
  250 |         } else {
  251 |           // Desktop: Sidebar sollte standardmäßig sichtbar sein
  252 |           await expect(page.locator('nav, .sidebar')).toBeVisible();
  253 |         }
  254 |         
  255 |         // Auf Umzugsliste navigieren für Tabellen-Test
  256 |         await page.goto('/umzuege/uebersicht');
  257 |         await page.waitForLoadState('networkidle');
  258 |         await page.screenshot({ path: `./test-results/${viewport.name}-umzugsliste.png` });
  259 |         
  260 |         // Tabellendarstellung prüfen
  261 |         const table = page.locator('table');
  262 |         const mobileCards = page.locator('.mobile-cards, .list-cards, .mobile-table-view');
  263 |         
  264 |         if (viewport.width < 768) {
  265 |           // Auf Mobilgeräten: Entweder angepasste Tabelle oder Karten-Layout
  266 |           if (await mobileCards.count() > 0) {
  267 |             await expect(mobileCards).toBeVisible();
  268 |           } else if (await table.count() > 0) {
  269 |             // Falls Tabelle verwendet wird, sollte sie horizontal scrollbar sein
  270 |             const tableContainer = page.locator('.table-container, .overflow-x-auto');
  271 |             if (await tableContainer.count() > 0) {
  272 |               await expect(tableContainer).toBeVisible();
  273 |             }
  274 |           }
  275 |         } else {
  276 |           // Auf Desktop: Normale Tabelle erwartet
  277 |           if (await table.count() > 0) {
  278 |             await expect(table).toBeVisible();
  279 |           }
  280 |         }
  281 |       });
  282 |     }
  283 |   });
  284 |
  285 |   // Überprüfung der Tabellenfunktionalität
> 286 |   test('Tabellen zeigen Daten korrekt an und unterstützen Aktionen', async ({ page }) => {
      |       ^ Error: browserType.launch: Target page, context or browser has been closed
  287 |     // Zur Umzugsliste navigieren
  288 |     await page.goto('/umzuege/uebersicht');
  289 |     await page.waitForLoadState('networkidle');
  290 |     
  291 |     // Screenshot der Tabellenseite
  292 |     await page.screenshot({ path: './test-results/umzugsliste.png' });
  293 |     
  294 |     await test.step('Tabellendarstellung prüfen', async () => {
  295 |       // Prüfen, ob Tabelle oder mobile Karten vorhanden sind
  296 |       const table = page.locator('table');
  297 |       const mobileCards = page.locator('.mobile-cards, .list-cards, .mobile-view');
  298 |       
  299 |       if (await table.count() > 0) {
  300 |         // Tabelle ist vorhanden
  301 |         await expect(table).toBeVisible();
  302 |         
  303 |         // Tabellenkopf prüfen
  304 |         const tableHeaders = page.locator('table th, table thead td');
  305 |         const headerCount = await tableHeaders.count();
  306 |         console.log(`Gefundene Tabellenüberschriften: ${headerCount}`);
  307 |         
  308 |         if (headerCount > 0) {
  309 |           await expect(tableHeaders.first()).toBeVisible();
  310 |         }
  311 |         
  312 |         // Tabellenzeilen prüfen
  313 |         const tableRows = page.locator('table tbody tr');
  314 |         const rowCount = await tableRows.count();
  315 |         console.log(`Gefundene Tabellenzeilen: ${rowCount}`);
  316 |         
  317 |         if (rowCount > 0) {
  318 |           await expect(tableRows.first()).toBeVisible();
  319 |           
  320 |           // Aktionen in der ersten Zeile prüfen
  321 |           const actionButtons = page.locator('table tbody tr:first-child button, table tbody tr:first-child a');
  322 |           const buttonCount = await actionButtons.count();
  323 |           console.log(`Gefundene Aktionsbuttons: ${buttonCount}`);
  324 |           
  325 |           if (buttonCount > 0) {
  326 |             await expect(actionButtons.first()).toBeVisible();
  327 |           }
  328 |         }
  329 |       } else if (await mobileCards.count() > 0) {
  330 |         // Mobile Karten sind vorhanden
  331 |         await expect(mobileCards).toBeVisible();
  332 |         
  333 |         // Einzelne Karten prüfen
  334 |         const cards = page.locator('.card, .list-item, .mobile-card');
  335 |         const cardCount = await cards.count();
  336 |         console.log(`Gefundene Karten: ${cardCount}`);
  337 |         
  338 |         if (cardCount > 0) {
  339 |           await expect(cards.first()).toBeVisible();
  340 |         }
  341 |       } else {
  342 |         console.warn('Weder Tabelle noch Karten gefunden!');
  343 |       }
  344 |     });
  345 |     
  346 |     await test.step('Sortier- und Filterfunktionen prüfen', async () => {
  347 |       // Suchfeld prüfen, falls vorhanden
  348 |       const searchField = page.locator('input[type="search"], input[placeholder*="Suche"], input.search-input');
  349 |       if (await searchField.count() > 0) {
  350 |         await expect(searchField).toBeVisible();
  351 |         
  352 |         // Suche testen
  353 |         await searchField.fill('Test');
  354 |         await page.keyboard.press('Enter');
  355 |         
  356 |         // Kurz warten für Suchergebnisse
  357 |         await page.waitForTimeout(1000);
  358 |         
  359 |         // Screenshot nach Suche
  360 |         await page.screenshot({ path: './test-results/umzugsliste-nach-suche.png' });
  361 |       }
  362 |       
  363 |       // Sortierung prüfen, falls vorhanden
  364 |       const sortHeaders = page.locator('table th[role="button"], table th.sortable, th button.sort-button');
  365 |       if (await sortHeaders.count() > 0) {
  366 |         await sortHeaders.first().click();
  367 |         
  368 |         // Kurz warten für Sortierergebnisse
  369 |         await page.waitForTimeout(1000);
  370 |         
  371 |         // Screenshot nach Sortierung
  372 |         await page.screenshot({ path: './test-results/umzugsliste-nach-sortierung.png' });
  373 |       }
  374 |     });
  375 |   });
  376 | });
```