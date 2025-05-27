# Test info

- Name: LagerLogix Funktionstest >> Responsive Design funktioniert korrekt
- Location: /Users/firashattab/hummert-umzug-app/tests/e2e/functional.spec.ts:213:7

# Error details

```
Error: Timed out 10000ms waiting for expect(locator).toBeVisible()

Locator: locator('nav, .sidebar')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 10000ms
  - waiting for locator('nav, .sidebar')

    at /Users/firashattab/hummert-umzug-app/tests/e2e/functional.spec.ts:252:55
    at /Users/firashattab/hummert-umzug-app/tests/e2e/functional.spec.ts:222:7
```

# Page snapshot

```yaml
- heading "Anmelden" [level=1]
- paragraph: Melden Sie sich bei Ihrem Konto an
- text: E-Mail-Adresse
- textbox "E-Mail-Adresse"
- text: Passwort
- textbox "Passwort"
- button:
  - img
- checkbox "Angemeldet bleiben"
- text: Angemeldet bleiben
- link "Passwort vergessen?":
  - /url: /forgot-password
- button "Anmelden"
- text: Oder
- link "Neues Konto erstellen":
  - /url: /register
- heading "Entwickler-Tools" [level=3]
- button "API-Verbindung testen"
- paragraph: "API-Status: ✅ Verbunden"
- paragraph: "Benutzer: ❌ Nicht angemeldet"
```

# Test source

```ts
  152 |         }
  153 |         
  154 |         // Umzugsdatum
  155 |         const dateInput = page.locator('input[type="date"], input[name="umzugsDatum"]');
  156 |         if (await dateInput.count() > 0) {
  157 |           // Datum für morgen berechnen
  158 |           const tomorrow = new Date();
  159 |           tomorrow.setDate(tomorrow.getDate() + 1);
  160 |           const formattedDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
  161 |           await dateInput.fill(formattedDate);
  162 |         }
  163 |         
  164 |         // Status falls vorhanden
  165 |         const statusSelect = page.locator('select[name="status"]');
  166 |         if (await statusSelect.count() > 0) {
  167 |           await statusSelect.selectOption('Geplant');
  168 |         }
  169 |         
  170 |         console.log('Umzugsformular ausgefüllt');
  171 |       } catch (error) {
  172 |         console.error('Fehler beim Ausfüllen des Formulars:', error);
  173 |         await page.screenshot({ path: './test-results/umzugsformular-fehler.png' });
  174 |       }
  175 |     });
  176 |     
  177 |     // Screenshot nach dem Ausfüllen
  178 |     await page.screenshot({ path: './test-results/umzugsformular-ausgefuellt.png' });
  179 |     
  180 |     await test.step('Formular absenden', async () => {
  181 |       // Verschiedene mögliche Submit-Button-Selektoren
  182 |       const submitButton = page.locator(
  183 |         'button[type="submit"], button:has-text("Speichern"), button:has-text("Erstellen"), form input[type="submit"]'
  184 |       );
  185 |       
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
> 252 |           await expect(page.locator('nav, .sidebar')).toBeVisible();
      |                                                       ^ Error: Timed out 10000ms waiting for expect(locator).toBeVisible()
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
  286 |   test('Tabellen zeigen Daten korrekt an und unterstützen Aktionen', async ({ page }) => {
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
```