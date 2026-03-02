param(
  [string]$Source = "icons/gpt-boost.png",
  [string]$OutDir = "icons",
  [string]$Sizes = "16,32,48,128",
  [string]$Prefix = "icon"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Source)) {
  throw "Source image not found: $Source"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Add-Type -AssemblyName System.Drawing

$sizeValues = $Sizes.Split(",") |
  ForEach-Object { $_.Trim() } |
  Where-Object { $_ -match "^\d+$" } |
  ForEach-Object { [int]$_ } |
  Where-Object { $_ -gt 0 } |
  Select-Object -Unique

if (-not $sizeValues -or $sizeValues.Count -eq 0) {
  throw "No valid sizes provided. Example: -Sizes '16,32,48,128'"
}

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)

try {
  $sourceBitmap = New-Object System.Drawing.Bitmap($sourceImage)
  try {
    $cropSide = [Math]::Min($sourceBitmap.Width, $sourceBitmap.Height)
    $cropX = [Math]::Floor(($sourceBitmap.Width - $cropSide) / 2)
    $cropY = [Math]::Floor(($sourceBitmap.Height - $cropSide) / 2)
    $sourceRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropSide, $cropSide)

    foreach ($size in $sizeValues) {
      $targetBitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try {
        $graphics = [System.Drawing.Graphics]::FromImage($targetBitmap)
        try {
          $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
          $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $graphics.Clear([System.Drawing.Color]::Transparent)

          $destRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
          $graphics.DrawImage($sourceBitmap, $destRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
        }
        finally {
          $graphics.Dispose()
        }

        $outPath = Join-Path $OutDir "$Prefix$size.png"
        $targetBitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host "Generated $outPath"
      }
      finally {
        $targetBitmap.Dispose()
      }
    }
  }
  finally {
    $sourceBitmap.Dispose()
  }
}
finally {
  $sourceImage.Dispose()
}
