const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../public/placeholder.svg'), // Você pode trocar pelo seu ícone .ico depois
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true // Remove a barra de menu superior para parecer um app nativo
  });

  // Em produção, ele carrega a URL do seu app publicado
  // Em desenvolvimento local, ele carregaria o localhost
  win.loadURL('https://bgcigqzdtvnwxyyrrhde.supabase.co'); // Substitua pela URL final do seu app publicado
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});