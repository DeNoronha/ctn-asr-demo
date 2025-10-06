# Stop PostgreSQL Flexible Server
# This runbook stops the PostgreSQL server to save costs

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$ServerName
)

try {
    Write-Output "Connecting to Azure..."
    Connect-AzAccount -Identity
    
    Write-Output "Stopping PostgreSQL server: $ServerName in resource group: $ResourceGroupName"
    
    Stop-AzPostgreSqlFlexibleServer `
        -ResourceGroupName $ResourceGroupName `
        -Name $ServerName
    
    Write-Output "PostgreSQL server stopped successfully at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
} catch {
    Write-Error "Failed to stop PostgreSQL server: $_"
    throw
}
