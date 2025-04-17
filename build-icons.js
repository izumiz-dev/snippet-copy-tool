const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 必要なモジュールのインストール確認
try {
  require.resolve('jimp');
  console.log('jimpモジュールはすでにインストールされています。');
} catch (e) {
  console.log('jimpモジュールをインストールします...');
  try {
    execSync('npm install jimp --save-dev', { stdio: 'inherit' });
    console.log('jimpモジュールのインストールが完了しました。');
  } catch (err) {
    console.error('jimpモジュールのインストールに失敗しました:', err);
    process.exit(1);
  }
}

// jimpモジュールのインポート
const Jimp = require('jimp');

const iconSizes = [16, 24, 32, 48, 64, 128, 256, 512];
const iconsDir = path.join(__dirname, 'icons');
const iconDistDir = path.join(__dirname, 'build', 'icons');

// ディレクトリ作成
console.log('ビルドディレクトリを準備中...');
if (!fs.existsSync(path.join(__dirname, 'build'))) {
  fs.mkdirSync(path.join(__dirname, 'build'));
  console.log('buildディレクトリを作成しました。');
}

if (!fs.existsSync(iconDistDir)) {
  fs.mkdirSync(iconDistDir);
  console.log('build/iconsディレクトリを作成しました。');
}

// アプリアイコンPNG作成（SVGをPNGに直接変換できないため、事前に作成したPNGを使用）
console.log('アプリアイコンを作成中...');

// 単色のアイコンを生成する関数
async function createSimpleIcon(size, color, bgColor, outputPath) {
  try {
    console.log(`${size}x${size}のアイコンを生成中...`);
    // 新しい画像を作成
    const image = new Jimp(size, size, bgColor);
    
    // ドキュメントの形を描画（単純な四角形）
    const docWidth = Math.floor(size * 0.6);
    const docHeight = Math.floor(size * 0.7);
    const docX = Math.floor((size - docWidth) / 2);
    const docY = Math.floor((size - docHeight) / 2);
    
    // ドキュメント本体を描画
    for (let x = docX; x < docX + docWidth; x++) {
      for (let y = docY; y < docY + docHeight; y++) {
        image.setPixelColor(color, x, y);
      }
    }
    
    // ドキュメントの線を描画（簡易的なテキスト表現）
    const lineY1 = docY + Math.floor(docHeight * 0.3);
    const lineY2 = docY + Math.floor(docHeight * 0.5);
    const lineY3 = docY + Math.floor(docHeight * 0.7);
    
    const lineColor = Jimp.rgbaToInt(66, 133, 244, 255); // Google Blue
    
    // 3本の線を描画
    for (let x = docX + Math.floor(docWidth * 0.2); x < docX + Math.floor(docWidth * 0.8); x++) {
      image.setPixelColor(lineColor, x, lineY1);
      image.setPixelColor(lineColor, x, lineY2);
      image.setPixelColor(lineColor, x, lineY3);
    }
    
    // 画像を保存
    await image.writeAsync(outputPath);
    console.log(`生成: ${outputPath}`);
    return true;
  } catch (err) {
    console.error(`アイコン生成エラー (${size}x${size}):`, err);
    return false;
  }
}

// アイコンの生成
async function generateIcons() {
  // メインアイコンの色
  const bgColor = Jimp.rgbaToInt(25, 118, 210, 255); // 濃い青色の背景
  const fgColor = Jimp.rgbaToInt(255, 255, 255, 255); // 白色のアイコン
  
  try {
    // 各サイズのアイコンを生成
    for (const size of iconSizes) {
      const iconPath = path.join(iconDistDir, `${size}x${size}.png`);
      await createSimpleIcon(size, fgColor, bgColor, iconPath);
    }
    
    // メインアイコン (icon.png)
    const mainIconPath = path.join(__dirname, 'icon.png');
    await createSimpleIcon(512, fgColor, bgColor, mainIconPath);
    
    // トレイアイコン (tray-icon.png) - 小さめサイズ
    const trayIconPath = path.join(__dirname, 'tray-icon.png');
    await createSimpleIcon(16, fgColor, bgColor, trayIconPath);
    
    console.log('すべてのアイコン生成が完了しました！');
  } catch (err) {
    console.error('アイコン生成中にエラーが発生しました:', err);
  }
}

// 生成処理を実行
generateIcons();
