<#
.SYNOPSIS
    Starts the PostgreSQL Flexible Server for office hours.

.DESCRIPTION
    This runbook starts the Azure Database for PostgreSQL Flexible Server.
    It uses the Automation Account's Managed Identity for authentication.

.NOTES
    Author: CTN Team
    Version: 1.0
    Created: 2024
#>

# Ensures you do not inherit an AzContext in your runbook
Disable-AzContextAutosave -Scope Process | Out-Null

# Connect using the Managed Identity
try {
    Write-Output "Connecting to Azure using Managed Identity..."
    Connect-AzAccount -Identity -ErrorAction Stop
    Write-Output "Successfully connected to Azure"
}
catch {
    Write-Error "Failed to connect using Managed Identity: $_"
    throw $_
}

# Get variables from Automation Account
try {
    $serverName = Get-AutomationVariable -Name 'PostgresServerName'
    $resourceGroup = Get-AutomationVariable -Name 'PostgresResourceGroup'
    $subscriptionId = Get-AutomationVariable -Name 'SubscriptionId'
    
    Write-Output "Server Name: $serverName"
    Write-Output "Resource Group: $resourceGroup"
    Write-Output "Subscription ID: $subscriptionId"
}
catch {
    Write-Error "Failed to retrieve automation variables: $_"
    throw $_
}

# Set the subscription context
Set-AzContext -SubscriptionId $subscriptionId | Out-Null

# Check current server status
try {
    Write-Output "Checking current server status..."
    $server = Get-AzPostgreSqlFlexibleServer -Name $serverName -ResourceGroupName $resourceGroup
    
    if ($null -eq $server) {
        Write-Error "Server $serverName not found in resource group $resourceGroup"
        throw "Server not found"
    }
    
    Write-Output "Current server state: $($server.State)"
    
    if ($server.State -eq 'Stopped') {
        Write-Output "Starting PostgreSQL server $serverName..."
        Start-AzPostgreSqlFlexibleServer -Name $serverName -ResourceGroupName $resourceGroup -NoWait
        Write-Output "Start command issued successfully. Server will be ready in a few minutes."
    }
    elseif ($server.State -eq 'Ready') {
        Write-Output "Server is already running. No action needed."
    }
    else {
        Write-Warning "Server is in state '$($server.State)'. Cannot start at this time."
    }
}
catch {
    Write-Error "Failed to start PostgreSQL server: $_"
    throw $_
}

Write-Output "Runbook completed successfully."
