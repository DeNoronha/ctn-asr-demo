# Start PostgreSQL Flexible Server
# This runbook starts the PostgreSQL server for working hours

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$ServerName
)

try {
    Write-Output "Connecting to Azure..."
    Connect-AzAccount -Identity
    
    Write-Output "Starting PostgreSQL server: $ServerName in resource group: $ResourceGroupName"
    
    Start-AzPostgreSqlFlexibleServer `
        -ResourceGroupName $ResourceGroupName `
        -Name $ServerName
    
    Write-Output "PostgreSQL server started successfully at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
} catch {
    Write-Error "Failed to start PostgreSQL server: $_"
    throw
}
