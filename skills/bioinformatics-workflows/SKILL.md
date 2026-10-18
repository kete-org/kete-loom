---
name: bioinformatics-workflows
description: Bioinformatics pipeline work on FASTA, FASTQ, SAM/BAM/CRAM and VCF files with Biopython, samtools, bcftools, seqkit, FastQC, aligners such as bwa-mem2 and minimap2, and Snakemake or Nextflow workflows run in pinned conda, Docker or Apptainer environments so results reproduce. Use when parsing or converting sequence and alignment files, writing or debugging a Snakemake or Nextflow pipeline, running read QC, alignment or variant calling steps, or making a genomics analysis reproducible on a laptop, HPC cluster or cloud.
license: MIT
compatibility: Any Agent Skills host. Needs the tools the pipeline uses (for example samtools, bcftools, snakemake or nextflow) and a conda/mamba, Docker or Apptainer install for pinned environments.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/requires: "samtools, bcftools"
  kete-loom/owner: "Kete-org"
---

# Bioinformatics workflows

Get sequence data from raw reads to results with every step scripted, every tool version pinned, and every intermediate file checked before the next step trusts it.

## Scope and limits

- This skill covers data handling and pipeline engineering. It does not choose the statistical model for a study or interpret variants clinically. Clinical or diagnostic use of variant calls needs a validated pipeline and review by a qualified clinical scientist; say so when the user's data is from patients.
- Human genomic data is personal data. Never upload it to a public service, paste it into an issue, or commit it to git. Ask where the data is allowed to live before moving it.

## 0. Before you start

1. Ask for, or find in the repo: organism and **reference genome build** (for example GRCh38 vs GRCh37, with the exact FASTA source), sequencing type (short-read Illumina, long-read ONT/PacBio), single or paired-end, and the expected output.
2. Inspect the inputs before writing code: `seqkit stats reads.fastq.gz`, `samtools quickcheck -v *.bam`, `samtools view -H sample.bam | head`, `bcftools view -h calls.vcf.gz | tail -5`.
3. Check that contig names agree across the reference, BAM header and VCF (`chr1` vs `1`). Mismatched builds or names are the most common silent failure. Stop and ask if they differ.

## 1. Know the formats

Detail and gotchas in `references/formats.md`. The rules that bite most often:

- FASTQ quality scores are Phred+33 on modern Illumina and ONT; old data may be Phred+64. Paired files must stay in the same read order.
- SAM text and VCF are 1-based, BED is 0-based half-open, and pysam returns 0-based starts (`read.reference_start`, `record.start`) even for SAM and VCF. Convert explicitly.
- BAM and VCF need sorting and an index (`.bai`/`.csi`, `.tbi`/`.csi`) before region queries. Compress VCF with `bgzip`, not `gzip`.
- CRAM needs the exact reference FASTA it was written against to decode.

## 2. Pick the tool

| Job | Use |
|---|---|
| Inspect, filter, sort, index BAM/CRAM | `samtools view`, `sort`, `index`, `flagstat`, `idxstats` |
| Filter, normalise, merge, query VCF/BCF | `bcftools view`, `norm`, `merge`, `query`, `index` |
| Fast FASTA/FASTQ stats, subset, convert | `seqkit` |
| Read QC and reports | FastQC, then MultiQC to aggregate |
| Short-read alignment to a genome | `bwa-mem2` (or `bwa mem`), `bowtie2` |
| Long reads, assemblies, spliced long reads | `minimap2` with the right preset (`-ax map-ont`, `-ax map-hifi`, `-ax splice`) |
| Interval arithmetic | `bedtools` |
| Parsing in Python | Biopython `SeqIO` for sequences, `pysam` for BAM/VCF |

Command patterns are in `references/commands.md`. Prefer a maintained community tool over hand-written parsing. Never parse BAM or VCF with regex.

## 3. Biopython essentials

- `SeqIO.parse(path, "fasta")` and `SeqIO.parse(handle, "fastq")` stream records; use them in a loop, not `list(...)`, for large files. Open `.gz` with `gzip.open(path, "rt")`.
- `SeqIO.index(path, "fasta")` for random access by ID without loading the file.
- `Bio.Entrez` needs `Entrez.email` set; keep within NCBI limits (3 requests/second, 10 with an API key).
- Write with `SeqIO.write(records, out, "fasta")`. Check record IDs are unique.

## 4. Build the pipeline in a workflow manager

Use Snakemake or Nextflow for anything with more than two steps or more than a handful of samples. Templates are in `references/workflow-managers.md`.

1. One rule or process per tool invocation. Inputs and outputs declared, never implied.
2. Sample list comes from a config or sample sheet (`config.yaml`, `samplesheet.csv`), never hard-coded.
3. Each rule or process names its own environment: a conda YAML with pinned versions, or a container image with a tag (better, a digest).
4. Threads and memory declared per step, so the executor can schedule on a cluster.
5. Write logs per step and per sample.
6. Dry-run before the real run: `snakemake -n` or `nextflow run main.nf -preview` (or `-stub-run` with stub blocks).
7. Rerun only what changed: Snakemake does this by default; Nextflow needs `-resume`.
8. Before writing a pipeline from scratch, check whether an nf-core pipeline or a Snakemake workflow catalog entry already does the job; reuse it if it fits.

## 5. Make it reproducible

- Pin every tool version (`samtools=1.24`, not `samtools`). Export the solved environment (`conda env export --no-builds` or a lock file) and commit it.
- Record the reference genome source URL, build and checksum. Keep reference files out of git; document how to fetch them.
- Fix random seeds where tools take one (subsampling: `seqkit sample -s 11`, `samtools view -s 42.1`).
- Generate a run report: Snakemake `--report report.html`, Nextflow `-with-report -with-trace -with-timeline`.
- Store raw data read-only. Never overwrite inputs in place.

## 6. Verify each step

After each stage, check before moving on:

- QC: FastQC/MultiQC flags reviewed; adapter content and per-base quality noted.
- Alignment: `samtools flagstat` mapping rate and properly-paired rate in a sensible range for the data type; `samtools quickcheck` passes.
- Variants: `bcftools stats` counts, transition/transversion ratio plausible for the organism and region; `bcftools norm -f ref.fa -c w -Ou -o /dev/null calls.vcf.gz` warns about no REF mismatches against the reference.
- Row and record counts agree between input and output where they should.

If a number is far outside what the data type normally gives, stop and report it to the user before continuing.

## Never

- Mix reference builds in one analysis.
- Use `latest` container tags or unpinned conda packages in a pipeline others will run.
- Delete intermediate files the user has not agreed can go (use Snakemake `temp()` or Nextflow cleanup only when agreed).
- Commit raw sequencing data, reference genomes or credentials to git.

## Report back

```
Inputs: <files, organism, build, read type>
Pipeline: <Snakemake|Nextflow>, entry <file>, environments <how pinned>
Ran: <exact command>, <dry-run result>, <real run result>
Checks: <QC, flagstat, bcftools stats numbers>
Outputs: <paths>
Open issues: <anything outside expected ranges, unresolved mismatches>
```
