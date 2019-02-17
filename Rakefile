# frozen_string_literal: true

@out_directory = '_site'
directory @out_directory

task default: [:compress]

def images
  Rake::FileList.new(
    File.join(@out_directory, 'images', '*.png'),
    File.join(@out_directory, 'images', '*.jpeg'),
    File.join(@out_directory, 'images', '*.jpg')
    )
end

def markup
  Rake::FileList.new(
    File.join(@out_directory, '**', '*.xml'),
    File.join(@out_directory, '**', '*.html'),
    File.join(@out_directory, '**', '*.css'),
    File.join(@out_directory, '**', '*.txt')
    )
end

task compress: [:images, :compress_images]
multitask compress_images: [:gz, :br]
multitask webp: images.pathmap('%p.webp')
multitask gz: markup.pathmap('%p.gz')
multitask br: markup.pathmap('%p.br')
task images: [:exif, :crush, :webp]

rule '.png.webp' => ['.png'] do |t|
  sh "cwebp -lossless \"#{t.source}\" -o \"#{t.name}\""
end

rule '.jpeg.webp' => '.jpeg' do |t|
  sh "cwebp -q 80 \"#{t.source}\" -o \"#{t.name}\""
end

rule '.jpg.webp' => '.jpg' do |t|
  sh "cwebp -q 80 \"#{t.source}\" -o \"#{t.name}\""
end

rule '.html.gz' => '.html' do |t|
  sh "gzip --keep -9 \"#{t.source}\""
end

rule '.css.gz' => '.css' do |t|
  sh "gzip --keep -9 \"#{t.source}\""
end

rule '.xml.gz' => '.xml' do |t|
  sh "gzip --keep -9 \"#{t.source}\""
end

rule '.txt.gz' => '.txt' do |t|
  sh "gzip --keep -9 \"#{t.source}\""
end

rule '.html.br' => '.html' do |t|
  sh "brotli --no-copy-stat --keep --best --output=\"#{t.name}\" \"#{t.source}\""
end

rule '.css.br' => '.css' do |t|
  sh "brotli --no-copy-stat --keep --best --output=\"#{t.name}\" \"#{t.source}\""
end

rule '.xml.br' => '.xml' do |t|
  sh "brotli --no-copy-stat --keep --best --output=\"#{t.name}\" \"#{t.source}\""
end

rule '.txt.br' => '.txt' do |t|
  sh "brotli --no-copy-stat --keep --best --output=\"#{t.name}\" \"#{t.source}\""
end

task :exif do
  image_dir = File.join(@out_directory, 'images')
  #sh "exiftool -overwrite_original -r -all= #{image_dir}"
end

task :crush do
  pngs = Rake::FileList.new(File.join(@out_directory, 'images', '*.png'))
  pngs.each do |png|
   sh "pngcrush -ow \"#{png}\""
  end
end
