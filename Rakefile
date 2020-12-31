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

task compress: [:images]
multitask webp: images.pathmap('%p.webp')
task images: [:exif, :crush, :webp]

rule '.png.webp' => ['.png'] do |t|
  sh "cwebp -z 9 -lossless \"#{t.source}\" -o \"#{t.name}\""
end

rule '.jpeg.webp' => '.jpeg' do |t|
  sh "cwebp -q 80 \"#{t.source}\" -o \"#{t.name}\""
end

rule '.jpg.webp' => '.jpg' do |t|
  sh "cwebp -q 80 \"#{t.source}\" -o \"#{t.name}\""
end

task :exif do
  image_dir = File.join(@out_directory, 'images')
  sh "exiftool -overwrite_original -r -all= #{image_dir}"
end

task :crush do
  pngs = Rake::FileList.new(File.join(@out_directory, 'images', '*.png'))
  pngs.each do |png|
   sh "pngcrush -ow \"#{png}\""
  end
end
