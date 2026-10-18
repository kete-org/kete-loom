# Command patterns

Check each tool's `--help` for the installed version before relying on a flag.

## Inspect

```bash
seqkit stats -a reads_R1.fastq.gz reads_R2.fastq.gz
samtools quickcheck -v sample.bam && echo ok
samtools view -H sample.bam            # header: @SQ contigs, @RG read groups, @PG programs
samtools flagstat -@ 4 sample.bam
samtools idxstats sample.bam           # reads per contig (needs index)
bcftools view -h calls.vcf.gz | tail
bcftools stats calls.vcf.gz > calls.stats.txt
```

## QC

```bash
mkdir -p qc
fastqc -t 4 -o qc/ reads_R1.fastq.gz reads_R2.fastq.gz
multiqc qc/ -o qc/
```

## Align short reads and make an indexed BAM

```bash
bwa-mem2 index ref.fa                                   # once per reference
bwa-mem2 mem -t 8 -R '@RG\tID:s1\tSM:s1\tPL:ILLUMINA' ref.fa R1.fq.gz R2.fq.gz \
  | samtools sort -@ 4 -o s1.sorted.bam -
samtools index s1.sorted.bam
```

Long reads: `minimap2 -ax map-ont ref.fa reads.fq.gz | samtools sort -o out.bam -` (use `map-hifi` for PacBio HiFi, `splice` for spliced cDNA).

## Mark duplicates with samtools

```bash
samtools sort -n -o s1.name.bam s1.sorted.bam
samtools fixmate -m s1.name.bam s1.fixmate.bam
samtools sort -o s1.pos.bam s1.fixmate.bam
samtools markdup s1.pos.bam s1.markdup.bam
samtools index s1.markdup.bam
```

## Variants

```bash
bcftools mpileup -f ref.fa -Ou s1.markdup.bam | bcftools call -mv -Oz -o s1.vcf.gz
bcftools index -t s1.vcf.gz
bcftools norm -f ref.fa -m -any -Oz -o s1.norm.vcf.gz s1.vcf.gz
bcftools view -i 'QUAL>=30 && INFO/DP>=10' -Oz -o s1.filt.vcf.gz s1.norm.vcf.gz
bcftools query -f '%CHROM\t%POS\t%REF\t%ALT\t[%GT]\n' s1.filt.vcf.gz
```

Filter thresholds are examples; choose them for the data and caller, and say which you used.

## Regions and intervals

```bash
samtools view -b -o region.bam s1.markdup.bam chr1:1000000-2000000
bcftools view -r chr1:1000000-2000000 s1.filt.vcf.gz
bedtools intersect -a calls.bed -b targets.bed -u
```

## Subsampling with a fixed seed

```bash
seqkit sample -s 11 -p 0.1 reads.fq.gz -o sub.fq.gz
samtools view -b -s 42.1 -o sub.bam s1.markdup.bam     # seed 42, keep 10%
```
