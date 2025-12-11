# PowerShell Script to Convert Markdown to Word Document
# This script uses Microsoft Word COM object to create a properly formatted document

param(
    [string]$InputFile = "docs\security_assessment.md",
    [string]$OutputFile = "docs\security_assessment.docx"
)

Write-Host "Converting Markdown to Word Document..." -ForegroundColor Cyan
Write-Host "Input: $InputFile" -ForegroundColor Gray
Write-Host "Output: $OutputFile" -ForegroundColor Gray
Write-Host ""

# Check if input file exists
if (-not (Test-Path $InputFile)) {
    Write-Host "Error: Input file not found: $InputFile" -ForegroundColor Red
    exit 1
}

# Read the markdown file
$content = Get-Content $InputFile -Raw

# Try to use Word COM object
try {
    Write-Host "Opening Microsoft Word..." -ForegroundColor Yellow
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    
    Write-Host "Creating new document..." -ForegroundColor Yellow
    $doc = $word.Documents.Add()
    
    # Constants for Word formatting
    $wdStyleHeading1 = -2
    $wdStyleHeading2 = -3
    $wdStyleHeading3 = -4
    $wdStyleHeading4 = -5
    $wdParagraph = 4
    $wdLine = 5
    $wdAlignCenter = 1
    $wdAlignLeft = 0
    $wdColorRed = 255
    $wdColorOrange = 42495
    $wdColorYellow = 65535
    $wdColorGreen = 32768
    $wdColorGray = 8421504
    $wdBorderBottom = -3
    
    # Parse and format content
    Write-Host "Parsing and formatting content..." -ForegroundColor Yellow
    
    $lines = $content -split "`r?`n"
    $inCodeBlock = $false
    $inTable = $false
    $tableLines = @()
    
    foreach ($line in $lines) {
        # Handle code blocks
        if ($line -match '^```') {
            $inCodeBlock = -not $inCodeBlock
            continue
        }
        
        if ($inCodeBlock) {
            # Add code with monospace font
            $para = $doc.Content.Paragraphs.Add()
            $para.Range.Text = $line
            $para.Range.Font.Name = "Consolas"
            $para.Range.Font.Size = 9
            $para.Range.Shading.BackgroundPatternColor = 15132390  # Light gray
            $para.Range.InsertParagraphAfter()
            continue
        }
        
        # Handle horizontal rules
        if ($line -match '^---+$') {
            $para = $doc.Content.Paragraphs.Add()
            $para.Borders.Item($wdBorderBottom).LineStyle = 1
            $para.Range.InsertParagraphAfter()
            continue
        }
        
        # Handle headers
        if ($line -match '^# (.+)$') {
            $para = $doc.Content.Paragraphs.Add()
            $para.Range.Text = $matches[1]
            $para.Style = $wdStyleHeading1
            $para.Range.InsertParagraphAfter()
            continue
        }
        if ($line -match '^## (.+)$') {
            $para = $doc.Content.Paragraphs.Add()
            $para.Range.Text = $matches[1]
            $para.Style = $wdStyleHeading2
            $para.Range.InsertParagraphAfter()
            continue
        }
        if ($line -match '^### (.+)$') {
            $para = $doc.Content.Paragraphs.Add()
            $para.Range.Text = $matches[1]
            $para.Style = $wdStyleHeading3
            $para.Range.InsertParagraphAfter()
            continue
        }
        if ($line -match '^#### (.+)$') {
            $para = $doc.Content.Paragraphs.Add()
            $para.Range.Text = $matches[1]
            $para.Style = $wdStyleHeading4
            $para.Range.InsertParagraphAfter()
            continue
        }
        
        # Handle tables
        if ($line -match '^\|') {
            if (-not $inTable) {
                $inTable = $true
                $tableLines = @()
            }
            $tableLines += $line
            continue
        } elseif ($inTable) {
            # Process accumulated table
            if ($tableLines.Count -gt 0) {
                # Parse table
                $rows = @()
                foreach ($tLine in $tableLines) {
                    if ($tLine -match '^\|[-:\s|]+\|$') { continue }  # Skip separator line
                    $cells = $tLine -split '\|' | Where-Object { $_ -match '\S' } | ForEach-Object { $_.Trim() }
                    if ($cells.Count -gt 0) {
                        $rows += ,@($cells)
                    }
                }
                
                if ($rows.Count -gt 0) {
                    # Create Word table
                    $range = $doc.Content
                    $range.Collapse(0)  # Collapse to end
                    $table = $doc.Tables.Add($range, $rows.Count, $rows[0].Count)
                    $table.Borders.Enable = $true
                    
                    # Fill table
                    for ($r = 0; $r -lt $rows.Count; $r++) {
                        for ($c = 0; $c -lt $rows[$r].Count; $c++) {
                            $cellText = $rows[$r][$c] -replace '\*\*(.+?)\*\*', '$1'  # Remove bold markers
                            $cellText = $cellText -replace '`(.+?)`', '$1'  # Remove code markers
                            $cellText = $cellText -replace '[✅❌⚠️🔴🟠🟡🟢]', ''  # Remove emojis (Word may not render)
                            $table.Cell($r + 1, $c + 1).Range.Text = $cellText
                        }
                    }
                    
                    # Style header row
                    if ($rows.Count -gt 0) {
                        $table.Rows.Item(1).Shading.BackgroundPatternColor = 15132390
                        $table.Rows.Item(1).Range.Font.Bold = $true
                    }
                    
                    # Add paragraph after table
                    $para = $doc.Content.Paragraphs.Add()
                    $para.Range.InsertParagraphAfter()
                }
            }
            $inTable = $false
            $tableLines = @()
        }
        
        # Handle bold text
        if ($line -match '\*\*(.+?)\*\*') {
            $para = $doc.Content.Paragraphs.Add()
            $text = $line -replace '\*\*(.+?)\*\*', '$1'
            $para.Range.Text = $text
            if ($line -match '^\*\*') {
                $para.Range.Font.Bold = $true
            }
            $para.Range.InsertParagraphAfter()
            continue
        }
        
        # Handle list items
        if ($line -match '^\s*[-*+]\s+(.+)$') {
            $para = $doc.Content.Paragraphs.Add()
            $para.Range.Text = "• " + $matches[1]
            $para.LeftIndent = 20
            $para.Range.InsertParagraphAfter()
            continue
        }
        
        # Handle numbered lists
        if ($line -match '^\s*\d+\.\s+(.+)$') {
            $para = $doc.Content.Paragraphs.Add()
            $para.Range.Text = $line
            $para.Range.InsertParagraphAfter()
            continue
        }
        
        # Handle regular paragraphs
        if ($line.Trim() -ne '') {
            $para = $doc.Content.Paragraphs.Add()
            $cleanText = $line -replace '\*\*(.+?)\*\*', '$1'  # Remove bold markers
            $cleanText = $cleanText -replace '`(.+?)`', '$1'   # Remove inline code markers
            $cleanText = $cleanText -replace '\[(.+?)\]\(.+?\)', '$1'  # Remove links
            $para.Range.Text = $cleanText
            $para.Range.InsertParagraphAfter()
        }
    }
    
    # Save document
    Write-Host "Saving document..." -ForegroundColor Yellow
    $fullPath = Resolve-Path $OutputFile -ErrorAction SilentlyContinue
    if (-not $fullPath) {
        $fullPath = Join-Path (Get-Location) $OutputFile
    }
    $doc.SaveAs([ref]$fullPath, [ref]16)  # 16 = wdFormatDocumentDefault (.docx)
    
    # Close and cleanup
    Write-Host "Closing Word..." -ForegroundColor Yellow
    $doc.Close()
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    
    Write-Host ""
    Write-Host "Success! Document created: $OutputFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: Tables and complex formatting have been preserved." -ForegroundColor Cyan
    Write-Host "You may want to review the document and adjust formatting as needed." -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "Error: Could not create Word document using COM object." -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative methods:" -ForegroundColor Yellow
    Write-Host "1. Install Pandoc: winget install --id JohnMacFarlane.Pandoc" -ForegroundColor Cyan
    Write-Host "   Then run: pandoc docs\security_assessment.md -o docs\security_assessment.docx" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Use online converter: https://www.markdowntoword.com/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Open in VS Code and use 'Markdown PDF' extension" -ForegroundColor Cyan
    exit 1
}
