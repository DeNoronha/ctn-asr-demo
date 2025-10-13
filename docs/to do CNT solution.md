2for the APIs used in the Association Register itself we can use Entra ID. For the ones which are exposed to the members or used by the systems of the members we need to implement Keycloak

implement APIM for rate limiting etc

Implement aikido in the pipeline. 

check if we can use the devops pipeline. 

Check the pipeline YAML file (likely azure-pipelines.yml or similar in the CTN project). Find and remove the Terraform Validate step/task. Keep only the Bicep-related steps. Deploy to Azure. We don't use Terraform, only Bicep. Remove any references to Terraform.


Add the following agents. The ones in bold are done.

**Design Analyst (DA)** 
**Security Analyst (SA)**
Performance Tuner (PT)
**Code Reviewer (CR)**
Technical Writer (TW)
Database Expert (DE)
Architecture Reviewer
**Test Engineer (TE)**
Quality Auditor (QA)
Research Manager (RM)






add simple verification (dns) to one of the onboarding methods

extraction of data from KVK pdf to be tested and integrated in validation workflow. 

international KVK (see arjen)

firewall waf

testplan, automated testing, trstcases

