export async function exportStatusReportToImage(reportTitle: string): Promise<void> {
  const element = document.getElementById('statusReportExportArea')
  if (!element) return

  try {
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    })
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reportTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.jpg`
        a.click()
        URL.revokeObjectURL(url)
      },
      'image/jpeg',
      0.95,
    )
  } catch (e) {
    console.error('[StatusReport] Erro ao exportar imagem:', e)
  }
}
